import os
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import Column, Float, Integer, String, create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./xoriva.db")

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

app = FastAPI(title="Xoriva OptiPulse HealthOps", version="1.0.0")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    threshold = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    location = Column(String, default="Main Store")


Base.metadata.create_all(bind=engine)


class InventoryCreate(BaseModel):
    item_name: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    quantity: int = Field(..., ge=0)
    threshold: int = Field(..., ge=0)
    unit_price: float = Field(..., ge=0)
    location: str = "Main Store"


class InventoryOut(InventoryCreate):
    id: int

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def root():
    return {"status": "running", "app": "Xoriva OptiPulse HealthOps"}


@app.post("/seed")
def seed_demo_data():
    demo_items = [
        {"item_name": "N95 Masks", "category": "PPE", "quantity": 20, "threshold": 50, "unit_price": 1.50, "location": "Clinic A"},
        {"item_name": "Insulin Syringes", "category": "Medical Supply", "quantity": 300, "threshold": 100, "unit_price": 0.25, "location": "Pharmacy"},
        {"item_name": "Glucose Test Strips", "category": "Lab", "quantity": 35, "threshold": 75, "unit_price": 0.80, "location": "Lab Room"},
        {"item_name": "Paracetamol", "category": "Medicine", "quantity": 500, "threshold": 100, "unit_price": 0.12, "location": "Pharmacy"},
        {"item_name": "IV Saline Bags", "category": "Emergency", "quantity": 40, "threshold": 60, "unit_price": 2.20, "location": "ER"},
    ]
    db = SessionLocal()
    try:
        db.query(Inventory).delete()
        for item in demo_items:
            db.add(Inventory(**item))
        db.commit()
        return {"message": "Demo data loaded", "count": len(demo_items)}
    finally:
        db.close()


@app.get("/inventory", response_model=List[InventoryOut])
def list_inventory():
    db = SessionLocal()
    try:
        return db.query(Inventory).order_by(Inventory.id.desc()).all()
    finally:
        db.close()


@app.post("/inventory", response_model=InventoryOut)
def create_inventory(item: InventoryCreate):
    db = SessionLocal()
    try:
        record = Inventory(**item.model_dump())
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
    finally:
        db.close()


@app.delete("/inventory/{item_id}")
def delete_inventory(item_id: int):
    db = SessionLocal()
    try:
        record = db.query(Inventory).filter(Inventory.id == item_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Item not found")
        db.delete(record)
        db.commit()
        return {"message": "Item deleted"}
    finally:
        db.close()


@app.get("/alerts")
def alerts():
    db = SessionLocal()
    try:
        items = db.query(Inventory).all()
        return [
            {
                "id": item.id,
                "item_name": item.item_name,
                "category": item.category,
                "quantity": item.quantity,
                "threshold": item.threshold,
                "location": item.location,
                "message": f"{item.item_name} is low in stock at {item.location}. Current: {item.quantity}, threshold: {item.threshold}.",
            }
            for item in items
            if item.quantity <= item.threshold
        ]
    finally:
        db.close()


@app.get("/analytics")
def analytics():
    db = SessionLocal()
    try:
        items = db.query(Inventory).all()
        total_items = len(items)
        low_stock = len([i for i in items if i.quantity <= i.threshold])
        total_units = sum(i.quantity for i in items)
        total_value = sum(i.quantity * i.unit_price for i in items)
        categories = {}
        for i in items:
            categories[i.category] = categories.get(i.category, 0) + i.quantity
        return {
            "total_items": total_items,
            "total_units": total_units,
            "low_stock_alerts": low_stock,
            "inventory_value": round(total_value, 2),
            "category_units": categories,
        }
    finally:
        db.close()


@app.post("/agent-chat", response_model=ChatResponse)
def agent_chat(payload: ChatRequest):
    msg = payload.message.lower().strip()
    db = SessionLocal()
    try:
        items = db.query(Inventory).all()
        low_items = [i for i in items if i.quantity <= i.threshold]
        total_value = round(sum(i.quantity * i.unit_price for i in items), 2)

        if any(k in msg for k in ["low stock", "alert", "shortage"]):
            if not low_items:
                return {"reply": "No low-stock alerts right now."}
            names = ", ".join([f"{i.item_name} ({i.quantity}/{i.threshold})" for i in low_items])
            return {"reply": f"Current low-stock items are: {names}."}

        if any(k in msg for k in ["value", "cost", "worth"]):
            return {"reply": f"Total inventory value is ${total_value}."}

        if any(k in msg for k in ["how many", "total items", "count"]):
            return {"reply": f"There are {len(items)} inventory item types and {sum(i.quantity for i in items)} total units."}

        if "recommend" in msg or "order" in msg or "reorder" in msg:
            if not low_items:
                return {"reply": "No reorder is required now based on current thresholds."}
            recs = "; ".join([f"Order at least {max(i.threshold * 2 - i.quantity, i.threshold)} units of {i.item_name}" for i in low_items])
            return {"reply": recs}

        return {"reply": "I can answer: low stock alerts, inventory value, total item count, and reorder recommendations."}
    finally:
        db.close()
