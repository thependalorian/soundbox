import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
import logging

from app.api.deps import get_authenticated_device
from app.services.wayame_api_client import WayaMeAPIClient, get_wayame_api_client
from app.db.session import get_db
from app.db.helpers import get_or_create_merchant, get_or_create_organization, log_status_change
from app.db.models import Device, DeviceHeartbeatLog, DeviceStatusLog

router = APIRouter()
logger = logging.getLogger(__name__)

class DeviceRegistration(BaseModel):
    firmware_version: str
    device_type: str = "soundbox"

class HeartbeatData(BaseModel):
    battery: int
    signal: int

@router.post("/devices/register")
async def register_device(
    device_data: DeviceRegistration,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    device: Device = Depends(get_authenticated_device),
    wayame_client: WayaMeAPIClient = Depends(get_wayame_api_client)
):
    """
    Complete registration for a device that already exists (created via
    POST /devices, which is where its X-Device-Key was issued -- see
    app/api/deps.py). This endpoint no longer creates devices from thin
    air: an unauthenticated caller could otherwise announce any
    device_id/merchant_id pair it liked, which is exactly the spoofing
    this credential closes.
    """
    logger.info(f"Registering device: {device.device_code}")

    device.firmware_version = device_data.firmware_version
    previous_status = device.status
    if device.status != "active":
        device.status = "active"
    db.commit()
    if previous_status != "active":
        log_status_change(
            db, DeviceStatusLog, device.organization_id, "device_id", device.id,
            from_status=previous_status, to_status="active", note="Device registered.",
        )
        db.commit()

    if device.merchant_id:
        background_tasks.add_task(
            wayame_client.register_device,
            device_id=device.device_code,
            merchant_id=str(device.merchant_id),
            firmware_version=device_data.firmware_version
        )

    return {"status": "success", "message": "Device registered.", "device_id": str(device.id)}

@router.post("/devices/heartbeat")
async def device_heartbeat(
    heartbeat_data: HeartbeatData,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    device: Device = Depends(get_authenticated_device),
    wayame_client: WayaMeAPIClient = Depends(get_wayame_api_client)
):
    """
    Receive a heartbeat from a SoundBox device, persist the telemetry
    (fast-read on the device row plus an append-only history row), and
    forward it to WayaMe in the background.
    """
    logger.info(f"Received heartbeat from device: {device.device_code}")

    device.battery_level = heartbeat_data.battery
    device.signal_strength = heartbeat_data.signal
    device.last_heartbeat_at = datetime.utcnow()
    db.add(
        DeviceHeartbeatLog(
            id=uuid.uuid4(),
            organization_id=device.organization_id,
            device_id=device.id,
            battery_level=heartbeat_data.battery,
            signal_strength=heartbeat_data.signal,
        )
    )
    db.commit()

    background_tasks.add_task(
        wayame_client.send_heartbeat,
        device_id=device.device_code,
        battery=heartbeat_data.battery,
        signal=heartbeat_data.signal
    )

    return {"status": "ok"}
