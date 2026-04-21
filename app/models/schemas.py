from pydantic import BaseModel
from typing import Optional
from datetime import time, datetime

class Stop(BaseModel):
    stop_id: str
    type: str               # "pickup" | "delivery"
    address: str
    latitude: float
    longitude: float
    time_window_start: Optional[time] = None
    time_window_end: Optional[time] = None
    liters: float
    order_id: Optional[str] = None
    customer_name: Optional[str] = None

class RouteResponse(BaseModel):
    route_id: str
    driver_id: str
    delivery_date: str
    stops: list[Stop]       # Sekvencirana lista: pickup → delivery → ...
    total_liters: float
    estimated_duration_minutes: int
    generated_at: datetime