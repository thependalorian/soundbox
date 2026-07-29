import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
import logging

from app.services.wayame_api_client import WayaMeAPIClient, get_wayame_api_client
from app.db.session import get_db
from app.db.helpers import get_or_create_merchant, get_or_create_organization, log_status_change
from app.db.models import Device, DeviceHeartbeatLog, DeviceStatusLog

router = APIRouter()
logger = logging.getLogger(__name__)

class DeviceRegistration(BaseModel):
    device_id: str
    merchant_id: str
    firmware_version: str
    device_type: str = "soundbox"

class HeartbeatData(BaseModel):
    device_id: str
    battery: int
    signal: int

@router.post("/devices/register")
async def register_device(
    device_data: DeviceRegistration,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    wayame_client: WayaMeAPIClient = Depends(get_wayame_api_client)
):
    """
    Register a new SoundBox device: persist it, then forward the
    registration to WayaMe in the background.
    """
    logger.info(f"Registering device: {device_data.device_id}")

    organization = get_or_create_organization(db)
    merchant = get_or_create_merchant(db, organization.id, device_data.merchant_id)

    device = db.query(Device).filter(Device.device_code == device_data.device_id).first()
    if device is None:
        device = Device(
            id=uuid.uuid4(),
            organization_id=organization.id,
            merchant_id=merchant.id,
            device_code=device_data.device_id,
            firmware_version=device_data.firmware_version,
            status="active",
        )
        db.add(device)
        db.commit()
        db.refresh(device)
        log_status_change(
            db, DeviceStatusLog, organization.id, "device_id", device.id,
            from_status=None, to_status="active", note="Device registered.",
        )
        db.commit()
    else:
        device.firmware_version = device_data.firmware_version
        db.commit()

    background_tasks.add_task(
        wayame_client.register_device,
        device_id=device_data.device_id,
        merchant_id=device_data.merchant_id,
        firmware_version=device_data.firmware_version
    )

    return {"status": "success", "message": "Device registered.", "device_id": str(device.id)}

@router.post("/devices/heartbeat")
async def device_heartbeat(
    heartbeat_data: HeartbeatData,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    wayame_client: WayaMeAPIClient = Depends(get_wayame_api_client)
):
    """
    Receive a heartbeat from a SoundBox device, persist the telemetry
    (fast-read on the device row plus an append-only history row), and
    forward it to WayaMe in the background.
    """
    logger.info(f"Received heartbeat from device: {heartbeat_data.device_id}")

    device = db.query(Device).filter(Device.device_code == heartbeat_data.device_id).first()
    if device is None:
        raise HTTPException(status_code=404, detail="Device not registered.")

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
        device_id=heartbeat_data.device_id,
        battery=heartbeat_data.battery,
        signal=heartbeat_data.signal
    )

    return {"status": "ok"}
