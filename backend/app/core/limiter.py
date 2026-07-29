"""Shared rate limiter instance.

A module of its own so routers (app/api/auth.py) can import and decorate
with it without importing app.main, which would create a circular import.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
