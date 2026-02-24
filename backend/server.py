from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from mysql_adapter import MySQLAdapter
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
import uuid
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database connection (MongoDB الافتراضي أو MySQL متوافق مع Hostinger)
DB_BACKEND = os.environ.get("DB_BACKEND", "mongodb").lower()
if DB_BACKEND == "mysql":
    client = MySQLAdapter()
    db = client
else:
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY environment variable is required")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Root health check endpoint for deployment
@app.get("/health")
async def root_health_check():
    return {"status": "healthy", "service": "backend"}

# Syrian Governorates
SYRIAN_GOVERNORATES = [
    "دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس",
    "إدلب", "الرقة", "دير الزور", "الحسكة", "درعا", "السويداء", "القنيطرة"
]

# Categories
CATEGORIES = [
    "إلكترونيات", "أثاث", "سيارات", "عقارات", "ملابس", "كتب", "خدمات",
    "أجهزة منزلية", "رياضة", "أطفال", "حيوانات", "طاقة شمسية", "أخرى"
]

# ==================== MODELS ====================

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    phone: str  # رقم الهاتف إجباري
    country_code: str = "+963"  # كود الدولة (افتراضياً سوريا)
    governorate: Optional[str] = "دمشق"

class UserLogin(BaseModel):
    email: str
    password: str

class OTPVerify(BaseModel):
    phone: str
    code: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    phone: Optional[str] = ""
    country_code: Optional[str] = "+963"
    governorate: Optional[str] = "دمشق"
    is_admin: bool = False
    verified: bool = False  # حالة التحقق
    trust_score: int = 0
    trades_count: int = 0
    avatar: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class OfferCreate(BaseModel):
    title: str
    description: str
    category: str
    governorate: str
    wanted_items: str
    images: List[str] = []
    is_quick_trade: bool = False

class OfferResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    category: str
    governorate: str
    wanted_items: str
    images: List[str] = []
    is_quick_trade: bool = False
    user_id: str
    user_name: str
    user_trust_score: int = 0
    status: str = "active"
    views: int = 0
    created_at: str

class MessageCreate(BaseModel):
    receiver_id: str
    offer_id: str
    content: str
    message_type: str = "text"  # text, image, voice

class MessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    sender_id: str
    sender_name: str
    receiver_id: str
    offer_id: str
    content: str
    message_type: str
    is_read: bool = False
    created_at: str

class ConversationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    offer_id: str
    offer_title: str
    other_user_id: str
    other_user_name: str
    last_message: str
    unread_count: int = 0
    updated_at: str

class ReportCreate(BaseModel):
    reported_id: str
    report_type: str  # user, offer
    reason: str
    details: Optional[str] = None

class NotificationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title: str
    message: str
    type: Optional[str] = "message"
    notification_type: Optional[str] = None
    link: Optional[str] = None
    is_read: bool = False
    created_at: datetime

class AISuggestionRequest(BaseModel):
    item_description: str

class AISuggestionResponse(BaseModel):
    suggestions: List[str]
    market_value: str

# Blog Models
class BlogPostCreate(BaseModel):
    title: str
    content: str
    excerpt: Optional[str] = None
    cover_image: Optional[str] = None
    tags: List[str] = []
    category: Optional[str] = None
    is_published: bool = False

class BlogPostResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    content: str
    excerpt: Optional[str] = None
    cover_image: Optional[str] = None
    tags: List[str] = []
    category: Optional[str] = None
    author_id: str
    author_name: str
    is_published: bool = False
    views: int = 0
    created_at: str
    updated_at: str

# Page Builder Models
class PageBlock(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # hero, slider, text, image, listings, banner, contact
    content: Dict[str, Any] = {}
    order: int = 0

class PageCreate(BaseModel):
    title: str
    slug: str
    blocks: List[PageBlock] = []
    is_published: bool = False

class PageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    slug: str
    blocks: List[Dict] = []
    is_published: bool = False
    created_at: str
    updated_at: str

# Site Settings Models
class MenuItem(BaseModel):
    id: str
    label: str
    link: str
    icon: Optional[str] = None
    is_visible: bool = True
    order: int = 0
    open_in_new_tab: bool = False

class SiteSettingsUpdate(BaseModel):
    site_name: Optional[str] = None
    site_logo: Optional[str] = None
    custom_font: Optional[str] = None
    custom_font_name: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None
    footer_text: Optional[str] = None
    menu_items: Optional[List[MenuItem]] = None

# ==================== HELPER FUNCTIONS ====================

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="رمز غير صالح")
    except JWTError:
        raise HTTPException(status_code=401, detail="رمز غير صالح")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="المستخدم غير موجود")
    
    # التحقق من أن الحساب غير موقوف
    if user.get("is_active") == False:
        raise HTTPException(status_code=403, detail="حسابك موقوف. يرجى التواصل مع الإدارة")
    
    return user

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="غير مصرح")
    return current_user

async def get_verified_user(current_user: dict = Depends(get_current_user)):
    """التحقق من أن المستخدم محقق - الأدمن مستثنى"""
    # الأدمن مستثنى من شرط التحقق
    if current_user.get("is_admin", False):
        return current_user
    
    # التحقق من حالة التحقق
    if not current_user.get("verified", False):
        raise HTTPException(
            status_code=403, 
            detail="يجب التحقق من حسابك أولاً. تحقق من رسائل WhatsApp للحصول على كود التحقق"
        )
    return current_user

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))):
    """Get user if authenticated, otherwise return None"""
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id:
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            return user
    except:
        pass
    return None

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # التحقق من البريد الإلكتروني
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل")
    
    # التحقق من رقم الهاتف
    full_phone = f"{user_data.country_code}{user_data.phone}"
    existing_phone = await db.users.find_one({"phone": full_phone}, {"_id": 0})
    if existing_phone:
        raise HTTPException(status_code=400, detail="رقم الهاتف مستخدم بالفعل")
    
    # التحقق من صحة رقم الهاتف
    try:
        import phonenumbers
        parsed = phonenumbers.parse(full_phone, None)
        if not phonenumbers.is_valid_number(parsed):
            raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")
    except:
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "password": get_password_hash(user_data.password),
        "phone": full_phone,
        "country_code": user_data.country_code,
        "governorate": user_data.governorate or "دمشق",
        "is_admin": False,
        "verified": False,  # غير مفعّل افتراضياً
        "trust_score": 0,
        "trades_count": 0,
        "favorites": [],
        "avatar": None,
        "created_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    # لا يتم إرسال OTP تلقائياً - المستخدم سيطلبه بنفسه
    
    token = create_access_token({"sub": user_id})
    user_response = UserResponse(
        id=user_id,
        name=user_data.name,
        email=user_data.email,
        phone=full_phone,
        country_code=user_data.country_code,
        governorate=user_data.governorate or "دمشق",
        is_admin=False,
        verified=False,
        trust_score=0,
        trades_count=0,
        avatar=None,
        created_at=now
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")
    
    # التحقق من أن الحساب غير موقوف
    if user.get("is_active") == False:
        raise HTTPException(status_code=403, detail="حسابك موقوف. يرجى التواصل مع الإدارة")
    
    token = create_access_token({"sub": user["id"]})
    user_response = UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        phone=user.get("phone", ""),
        country_code=user.get("country_code", "+963"),
        governorate=user.get("governorate", "دمشق"),
        is_admin=user.get("is_admin", False),
        verified=user.get("verified", False),
        trust_score=user.get("trust_score", 0),
        trades_count=user.get("trades_count", 0),
        avatar=user.get("avatar"),
        created_at=user.get("created_at", "")
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        phone=current_user.get("phone", ""),
        country_code=current_user.get("country_code", "+963"),
        governorate=current_user.get("governorate", "دمشق"),
        is_admin=current_user.get("is_admin", False),
        verified=current_user.get("verified", False),
        trust_score=current_user.get("trust_score", 0),
        trades_count=current_user.get("trades_count", 0),
        avatar=current_user.get("avatar"),
        created_at=current_user.get("created_at", "")
    )

@api_router.put("/auth/profile")
async def update_profile(
    name: Optional[str] = None,
    phone: Optional[str] = None,
    governorate: Optional[str] = None,
    avatar: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    update_doc = {}
    if name: update_doc["name"] = name
    if phone: update_doc["phone"] = phone
    if governorate: update_doc["governorate"] = governorate
    if avatar: update_doc["avatar"] = avatar
    
    if update_doc:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_doc})
    
    return {"message": "تم تحديث الملف الشخصي"}

# ==================== OFFERS ENDPOINTS ====================

@api_router.post("/offers", response_model=OfferResponse)
async def create_offer(offer_data: OfferCreate, current_user: dict = Depends(get_verified_user)):
    offer_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    offer_doc = {
        "id": offer_id,
        "title": offer_data.title,
        "description": offer_data.description,
        "category": offer_data.category,
        "governorate": offer_data.governorate,
        "wanted_items": offer_data.wanted_items,
        "images": offer_data.images[:5],
        "is_quick_trade": offer_data.is_quick_trade,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "user_trust_score": current_user.get("trust_score", 0),
        "status": "active",
        "views": 0,
        "created_at": now
    }
    
    await db.offers.insert_one(offer_doc)
    
    return OfferResponse(**offer_doc)

@api_router.get("/offers", response_model=List[OfferResponse])
async def get_offers(
    category: Optional[str] = None,
    governorate: Optional[str] = None,
    search: Optional[str] = None,
    quick_trade: Optional[bool] = None,
    status: Optional[str] = "active",
    limit: int = 20,
    skip: int = 0
):
    query = {}
    if status:
        query["status"] = status
    if category and category != "all":
        query["category"] = category
    if governorate and governorate != "all":
        query["governorate"] = governorate
    if quick_trade:
        query["is_quick_trade"] = True
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    offers = await db.offers.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [OfferResponse(**o) for o in offers]

@api_router.get("/offers/{offer_id}", response_model=OfferResponse)
async def get_offer(offer_id: str, current_user: dict = Depends(get_optional_user)):
    offer = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="العرض غير موجود")
    
    # Increment views
    await db.offers.update_one({"id": offer_id}, {"$inc": {"views": 1}})
    offer["views"] = offer.get("views", 0) + 1
    
    return OfferResponse(**offer)

@api_router.put("/offers/{offer_id}", response_model=OfferResponse)
async def update_offer(offer_id: str, offer_data: OfferCreate, current_user: dict = Depends(get_current_user)):
    offer = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="العرض غير موجود")
    if offer["user_id"] != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    update_doc = {
        "title": offer_data.title,
        "description": offer_data.description,
        "category": offer_data.category,
        "governorate": offer_data.governorate,
        "wanted_items": offer_data.wanted_items,
        "images": offer_data.images[:5],
        "is_quick_trade": offer_data.is_quick_trade
    }
    
    await db.offers.update_one({"id": offer_id}, {"$set": update_doc})
    
    updated = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    return OfferResponse(**updated)

@api_router.put("/offers/{offer_id}/status")
async def update_offer_status(offer_id: str, status: str, current_user: dict = Depends(get_current_user)):
    if status not in ["active", "completed", "cancelled", "pending"]:
        raise HTTPException(status_code=400, detail="حالة غير صالحة")
    
    offer = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="العرض غير موجود")
    if offer["user_id"] != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    await db.offers.update_one({"id": offer_id}, {"$set": {"status": status}})
    
    # Update user trades count if completed
    if status == "completed":
        await db.users.update_one({"id": offer["user_id"]}, {"$inc": {"trades_count": 1}})
    
    status_messages = {
        "completed": "تم تحديد العرض كمكتمل",
        "cancelled": "تم إلغاء العرض",
        "active": "تم تفعيل العرض",
        "pending": "العرض قيد المراجعة"
    }
    
    return {"message": status_messages.get(status, "تم التحديث")}

@api_router.delete("/offers/{offer_id}")
async def delete_offer(offer_id: str, current_user: dict = Depends(get_current_user)):
    offer = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="العرض غير موجود")
    if offer["user_id"] != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    await db.offers.delete_one({"id": offer_id})
    return {"message": "تم حذف العرض"}

@api_router.get("/my-offers", response_model=List[OfferResponse])
async def get_my_offers(current_user: dict = Depends(get_current_user)):
    offers = await db.offers.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [OfferResponse(**o) for o in offers]

# ==================== FAVORITES ENDPOINTS ====================

@api_router.post("/favorites/{offer_id}")
async def add_favorite(offer_id: str, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$addToSet": {"favorites": offer_id}}
    )
    return {"message": "تمت الإضافة للمفضلة"}

@api_router.delete("/favorites/{offer_id}")
async def remove_favorite(offer_id: str, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$pull": {"favorites": offer_id}}
    )
    return {"message": "تمت الإزالة من المفضلة"}

@api_router.get("/favorites", response_model=List[OfferResponse])
async def get_favorites(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    favorite_ids = user.get("favorites", [])
    
    if not favorite_ids:
        return []
    
    offers = await db.offers.find({"id": {"$in": favorite_ids}}, {"_id": 0}).to_list(100)
    return [OfferResponse(**o) for o in offers]

@api_router.get("/favorites/check/{offer_id}")
async def check_favorite(offer_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    is_favorite = offer_id in user.get("favorites", [])
    return {"is_favorite": is_favorite}

# ==================== MESSAGES ENDPOINTS ====================

@api_router.post("/messages", response_model=MessageResponse)
async def send_message(msg_data: MessageCreate, current_user: dict = Depends(get_verified_user)):
    msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    msg_doc = {
        "id": msg_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["name"],
        "receiver_id": msg_data.receiver_id,
        "offer_id": msg_data.offer_id,
        "content": msg_data.content,
        "message_type": msg_data.message_type,
        "is_read": False,
        "created_at": now
    }
    
    await db.messages.insert_one(msg_doc)
    
    # Create notification
    offer = await db.offers.find_one({"id": msg_data.offer_id}, {"_id": 0})
    offer_title = offer["title"] if offer else "عرض"
    
    notif_doc = {
        "id": str(uuid.uuid4()),
        "user_id": msg_data.receiver_id,
        "title": "رسالة جديدة",
        "message": f"رسالة جديدة من {current_user['name']} بخصوص {offer_title}",
        "notification_type": "message",
        "link": f"/messages?offer={msg_data.offer_id}&user={current_user['id']}",
        "is_read": False,
        "created_at": now
    }
    await db.notifications.insert_one(notif_doc)
    
    return MessageResponse(**msg_doc)

@api_router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(current_user: dict = Depends(get_current_user)):
    pipeline = [
        {
            "$match": {
                "$or": [
                    {"sender_id": current_user["id"]},
                    {"receiver_id": current_user["id"]}
                ]
            }
        },
        {"$sort": {"created_at": -1}},
        {
            "$group": {
                "_id": {
                    "offer_id": "$offer_id",
                    "other_user": {
                        "$cond": [
                            {"$eq": ["$sender_id", current_user["id"]]},
                            "$receiver_id",
                            "$sender_id"
                        ]
                    }
                },
                "last_message": {"$first": "$content"},
                "updated_at": {"$first": "$created_at"},
                "messages": {"$push": "$$ROOT"}
            }
        }
    ]
    
    results = await db.messages.aggregate(pipeline).to_list(100)
    conversations = []
    
    for r in results:
        other_user_id = r["_id"]["other_user"]
        offer_id = r["_id"]["offer_id"]
        
        other_user = await db.users.find_one({"id": other_user_id}, {"_id": 0})
        offer = await db.offers.find_one({"id": offer_id}, {"_id": 0})
        
        if other_user and offer:
            unread = sum(1 for m in r["messages"] if m["receiver_id"] == current_user["id"] and not m["is_read"])
            
            conversations.append(ConversationResponse(
                id=f"{offer_id}_{other_user_id}",
                offer_id=offer_id,
                offer_title=offer["title"],
                other_user_id=other_user_id,
                other_user_name=other_user["name"],
                last_message=r["last_message"],
                unread_count=unread,
                updated_at=r["updated_at"]
            ))
    
    return conversations

@api_router.get("/messages/{offer_id}/{user_id}", response_model=List[MessageResponse])
async def get_messages(offer_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    messages = await db.messages.find({
        "offer_id": offer_id,
        "$or": [
            {"sender_id": current_user["id"], "receiver_id": user_id},
            {"sender_id": user_id, "receiver_id": current_user["id"]}
        ]
    }, {"_id": 0}).sort("created_at", 1).to_list(100)
    
    # Mark as read
    await db.messages.update_many(
        {"offer_id": offer_id, "sender_id": user_id, "receiver_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    
    return [MessageResponse(**m) for m in messages]

@api_router.get("/messages/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.messages.count_documents({
        "receiver_id": current_user["id"],
        "is_read": False
    })
    return {"count": count}

# ==================== NOTIFICATIONS ENDPOINTS ====================

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    return [NotificationResponse(**n) for n in notifications]

@api_router.get("/notifications/unread-count")
async def get_notifications_unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({
        "user_id": current_user["id"],
        "is_read": False
    })
    return {"count": count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "تم التحديث"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "تم تحديث جميع الإشعارات"}

# ==================== REPORTS ENDPOINTS ====================

@api_router.post("/reports")
async def create_report(report_data: ReportCreate, current_user: dict = Depends(get_verified_user)):
    report_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    report_doc = {
        "id": report_id,
        "reporter_id": current_user["id"],
        "reporter_name": current_user["name"],
        "reported_id": report_data.reported_id,
        "report_type": report_data.report_type,
        "reason": report_data.reason,
        "details": report_data.details,
        "status": "pending",
        "created_at": now
    }
    
    await db.reports.insert_one(report_doc)
    return {"message": "تم إرسال البلاغ", "id": report_id}

# ==================== AI SUGGESTIONS ENDPOINT ====================

@api_router.post("/ai/suggest", response_model=AISuggestionResponse)
async def get_ai_suggestions(request: AISuggestionRequest, current_user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"barter_{current_user['id']}_{uuid.uuid4()}",
            system_message="""أنت مستشار مقايضة خبير في السوق السوري. مهمتك تحليل الأغراض المعروضة واقتراح 4-5 أغراض بديلة منطقية للمقايضة.
            
            يجب أن تكون اقتراحاتك:
            1. واقعية ومتاحة في السوق السوري
            2. متناسبة مع القيمة السوقية
            3. مطلوبة ومفيدة
            
            أجب بصيغة JSON فقط بدون أي نص إضافي:
            {"suggestions": ["اقتراح1", "اقتراح2", "اقتراح3", "اقتراح4"], "market_value": "تقدير القيمة بالليرة السورية"}"""
        ).with_model("gemini", "gemini-3-flash-preview")
        
        user_message = UserMessage(
            text=f"أريد مقايضة: {request.item_description}\n\nما هي أفضل الأغراض التي يمكن أن أقايض بها هذا الغرض في سوريا حالياً؟"
        )
        
        response = await chat.send_message(user_message)
        
        import json
        try:
            response_text = response.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            
            data = json.loads(response_text)
            return AISuggestionResponse(
                suggestions=data.get("suggestions", []),
                market_value=data.get("market_value", "غير محدد")
            )
        except json.JSONDecodeError:
            return AISuggestionResponse(
                suggestions=["موبايل حديث", "منظومة طاقة شمسية", "أثاث منزلي", "جهاز كهربائي"],
                market_value="يعتمد على حالة الغرض"
            )
            
    except Exception as e:
        logging.error(f"AI Error: {e}")
        return AISuggestionResponse(
            suggestions=["موبايل حديث", "منظومة طاقة شمسية", "أثاث منزلي", "جهاز كهربائي", "دراجة نارية"],
            market_value="يرجى التواصل للاتفاق على القيمة"
        )

# ==================== BLOG ENDPOINTS ====================

@api_router.post("/blog", response_model=BlogPostResponse)
async def create_blog_post(post_data: BlogPostCreate, current_user: dict = Depends(get_admin_user)):
    post_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    post_doc = {
        "id": post_id,
        "title": post_data.title,
        "content": post_data.content,
        "excerpt": post_data.excerpt or post_data.content[:200],
        "cover_image": post_data.cover_image,
        "tags": post_data.tags,
        "category": post_data.category,
        "author_id": current_user["id"],
        "author_name": current_user["name"],
        "is_published": post_data.is_published,
        "views": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.blog_posts.insert_one(post_doc)
    return BlogPostResponse(**post_doc)

@api_router.get("/blog", response_model=List[BlogPostResponse])
async def get_blog_posts(
    category: Optional[str] = None,
    tag: Optional[str] = None,
    published_only: bool = True,
    limit: int = 20,
    skip: int = 0
):
    query = {}
    if published_only:
        query["is_published"] = True
    if category:
        query["category"] = category
    if tag:
        query["tags"] = tag
    
    posts = await db.blog_posts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [BlogPostResponse(**p) for p in posts]

@api_router.get("/blog/{post_id}", response_model=BlogPostResponse)
async def get_blog_post(post_id: str):
    post = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="المقالة غير موجودة")
    
    await db.blog_posts.update_one({"id": post_id}, {"$inc": {"views": 1}})
    post["views"] = post.get("views", 0) + 1
    
    return BlogPostResponse(**post)

@api_router.put("/blog/{post_id}", response_model=BlogPostResponse)
async def update_blog_post(post_id: str, post_data: BlogPostCreate, current_user: dict = Depends(get_admin_user)):
    post = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="المقالة غير موجودة")
    
    update_doc = {
        "title": post_data.title,
        "content": post_data.content,
        "excerpt": post_data.excerpt or post_data.content[:200],
        "cover_image": post_data.cover_image,
        "tags": post_data.tags,
        "category": post_data.category,
        "is_published": post_data.is_published,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.blog_posts.update_one({"id": post_id}, {"$set": update_doc})
    updated = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    return BlogPostResponse(**updated)

@api_router.delete("/blog/{post_id}")
async def delete_blog_post(post_id: str, current_user: dict = Depends(get_admin_user)):
    await db.blog_posts.delete_one({"id": post_id})
    return {"message": "تم حذف المقالة"}

# ==================== PAGE BUILDER ENDPOINTS ====================

@api_router.post("/pages", response_model=PageResponse)
async def create_page(page_data: PageCreate, current_user: dict = Depends(get_admin_user)):
    # Check if slug exists
    existing = await db.pages.find_one({"slug": page_data.slug}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="هذا الرابط مستخدم بالفعل")
    
    page_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    page_doc = {
        "id": page_id,
        "title": page_data.title,
        "slug": page_data.slug,
        "blocks": [b.model_dump() for b in page_data.blocks],
        "is_published": page_data.is_published,
        "created_at": now,
        "updated_at": now
    }
    
    await db.pages.insert_one(page_doc)
    return PageResponse(**page_doc)

@api_router.get("/pages", response_model=List[PageResponse])
async def get_pages(published_only: bool = False):
    query = {}
    if published_only:
        query["is_published"] = True
    
    pages = await db.pages.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [PageResponse(**p) for p in pages]

@api_router.get("/pages/{slug}", response_model=PageResponse)
async def get_page_by_slug(slug: str):
    page = await db.pages.find_one({"slug": slug}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="الصفحة غير موجودة")
    return PageResponse(**page)

@api_router.put("/pages/{page_id}", response_model=PageResponse)
async def update_page(page_id: str, page_data: PageCreate, current_user: dict = Depends(get_admin_user)):
    page = await db.pages.find_one({"id": page_id}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="الصفحة غير موجودة")
    
    update_doc = {
        "title": page_data.title,
        "slug": page_data.slug,
        "blocks": [b.model_dump() for b in page_data.blocks],
        "is_published": page_data.is_published,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pages.update_one({"id": page_id}, {"$set": update_doc})
    updated = await db.pages.find_one({"id": page_id}, {"_id": 0})
    return PageResponse(**updated)

@api_router.delete("/pages/{page_id}")
async def delete_page(page_id: str, current_user: dict = Depends(get_admin_user)):
    await db.pages.delete_one({"id": page_id})
    return {"message": "تم حذف الصفحة"}

# ==================== SITE SETTINGS ENDPOINTS ====================

@api_router.get("/settings")
async def get_site_settings():
    settings = await db.settings.find_one({"type": "site"}, {"_id": 0})
    if not settings:
        # Return defaults
        return {
            "site_name": "زون | zone",
            "site_logo": None,
            "custom_font": None,
            "custom_font_name": "Tajawal",
            "primary_color": "#8b5cf6",
            "secondary_color": "#4f46e5",
            "contact_email": "info@badal.sy",
            "contact_phone": "+963999999999",
            "social_links": {},
            "footer_text": "منصة زون للمقايضة السورية © 2024"
        }
    return settings

@api_router.put("/settings")
async def update_site_settings(settings_data: SiteSettingsUpdate, current_user: dict = Depends(get_admin_user)):
    update_doc = {k: v for k, v in settings_data.model_dump().items() if v is not None}
    update_doc["type"] = "site"
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.settings.update_one(
        {"type": "site"},
        {"$set": update_doc},
        upsert=True
    )
    
    return {"message": "تم تحديث الإعدادات"}

# ==================== ADMIN ENDPOINTS ====================

@api_router.get("/admin/stats")
async def get_admin_stats(admin: dict = Depends(get_admin_user)):
    users_count = await db.users.count_documents({})
    offers_count = await db.offers.count_documents({})
    active_offers = await db.offers.count_documents({"status": "active"})
    pending_offers = await db.offers.count_documents({"status": "pending"})
    reports_count = await db.reports.count_documents({"status": "pending"})
    messages_count = await db.messages.count_documents({})
    blog_posts = await db.blog_posts.count_documents({})
    
    # Get offers by category
    category_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    categories = await db.offers.aggregate(category_pipeline).to_list(20)
    
    # Get offers by governorate
    gov_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$governorate", "count": {"$sum": 1}}}
    ]
    governorates = await db.offers.aggregate(gov_pipeline).to_list(20)
    
    # Recent activity
    recent_users = await db.users.find({}, {"_id": 0, "password": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_offers = await db.offers.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "users_count": users_count,
        "offers_count": offers_count,
        "active_offers": active_offers,
        "pending_offers": pending_offers,
        "pending_reports": reports_count,
        "messages_count": messages_count,
        "blog_posts": blog_posts,
        "by_category": {c["_id"]: c["count"] for c in categories if c["_id"]},
        "by_governorate": {g["_id"]: g["count"] for g in governorates if g["_id"]},
        "recent_users": recent_users,
        "recent_offers": recent_offers
    }

@api_router.get("/admin/users")
async def get_admin_users(admin: dict = Depends(get_admin_user), skip: int = 0, limit: int = 50, search: Optional[str] = None):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    users = await db.users.find(query, {"_id": 0, "password": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    return {"users": users, "total": total}

@api_router.put("/admin/users/{user_id}/status")
async def update_user_status(user_id: str, is_active: bool, admin: dict = Depends(get_admin_user)):
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": is_active}})
    return {"message": "تم تحديث حالة المستخدم"}

@api_router.put("/admin/users/{user_id}/admin")
async def toggle_admin(user_id: str, is_admin: bool, admin: dict = Depends(get_admin_user)):
    await db.users.update_one({"id": user_id}, {"$set": {"is_admin": is_admin}})
    return {"message": "تم تحديث صلاحيات المستخدم"}

@api_router.get("/admin/reports")
async def get_admin_reports(admin: dict = Depends(get_admin_user), status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    reports = await db.reports.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return reports

@api_router.put("/admin/reports/{report_id}")
async def update_report_status(report_id: str, status: str, admin: dict = Depends(get_admin_user)):
    await db.reports.update_one({"id": report_id}, {"$set": {"status": status}})
    return {"message": "تم التحديث"}

@api_router.put("/admin/users/{user_id}/trust")
async def update_user_trust(user_id: str, trust_score: int, admin: dict = Depends(get_admin_user)):
    await db.users.update_one({"id": user_id}, {"$set": {"trust_score": trust_score}})
    return {"message": "تم التحديث"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    await db.users.delete_one({"id": user_id})
    await db.offers.delete_many({"user_id": user_id})
    return {"message": "تم الحذف"}

@api_router.get("/admin/offers")
async def get_admin_offers(admin: dict = Depends(get_admin_user), status: Optional[str] = None, skip: int = 0, limit: int = 50):
    query = {}
    if status:
        query["status"] = status
    offers = await db.offers.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.offers.count_documents(query)
    return {"offers": offers, "total": total}

@api_router.put("/admin/offers/{offer_id}/status")
async def admin_update_offer_status(offer_id: str, status: str, admin: dict = Depends(get_admin_user)):
    await db.offers.update_one({"id": offer_id}, {"$set": {"status": status}})
    return {"message": "تم التحديث"}

# ==================== STATIC DATA ENDPOINTS ====================

@api_router.get("/governorates")
async def get_governorates():
    return SYRIAN_GOVERNORATES

@api_router.get("/categories")
async def get_categories():
    return CATEGORIES

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "مرحباً بك في منصة زون للمقايضة السورية"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Setup middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create default admin user on startup
@app.on_event("startup")
async def create_default_users():
    # Create admin
    admin = await db.users.find_one({"email": "admin@win.sy"}, {"_id": 0})
    if not admin:
        admin_doc = {
            "id": str(uuid.uuid4()),
            "name": "مدير النظام",
            "email": "admin@win.sy",
            "password": get_password_hash("admin123"),
            "phone": "+963999999999",
            "governorate": "دمشق",
            "is_admin": True,
            "is_active": True,
            "trust_score": 100,
            "trades_count": 0,
            "favorites": [],
            "avatar": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
        logger.info("Created default admin user")
    
    # Create test user
    test_user = await db.users.find_one({"email": "ali@example.com"}, {"_id": 0})
    if not test_user:
        user_doc = {
            "id": str(uuid.uuid4()),
            "name": "علي",
            "email": "ali@example.com",
            "password": get_password_hash("123"),
            "phone": "+963912345678",
            "governorate": "حلب",
            "is_admin": False,
            "is_active": True,
            "trust_score": 25,
            "trades_count": 3,
            "favorites": [],
            "avatar": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        logger.info("Created default test user")
    
    # Create default site settings
    settings = await db.settings.find_one({"type": "site"}, {"_id": 0})
    if not settings:
        settings_doc = {
            "type": "site",
            "site_name": "زون | zone",
            "site_logo": None,
            "custom_font": None,
            "custom_font_name": "Tajawal",
            "primary_color": "#8b5cf6",
            "secondary_color": "#4f46e5",
            "contact_email": "info@badal.sy",
            "contact_phone": "+963999999999",
            "social_links": {},
            "footer_text": "منصة زون للمقايضة السورية © 2024",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.settings.insert_one(settings_doc)
        logger.info("Created default site settings")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ==================== WHATSAPP ENDPOINTS ====================

from whatsapp_service import whatsapp_service
import phonenumbers

@api_router.get("/whatsapp/status")
async def get_whatsapp_status(user=Depends(get_admin_user)):
    """
    الحصول على حالة WhatsApp (Admin فقط)
    """
    return whatsapp_service.get_status()

@api_router.get("/whatsapp/qr")
async def get_whatsapp_qr(user=Depends(get_admin_user)):
    """
    الحصول على QR Code الحالي (Admin فقط)
    """
    return whatsapp_service.get_qr_code()

@api_router.post("/whatsapp/generate-qr")
async def generate_whatsapp_qr(user=Depends(get_admin_user)):
    """
    توليد QR Code لربط WhatsApp (Admin فقط)
    """
    try:
        qr_data = whatsapp_service.get_qr_code()
        
        if qr_data.get("status") == "authenticated":
            return {
                "status": "already_connected",
                "message": "WhatsApp متصل بالفعل",
                "connectedNumber": qr_data.get("connectedNumber")
            }
        
        if qr_data.get("qr_code"):
            return {
                "status": "success",
                "qr_code": qr_data.get("qr_code"),
                "message": "امسح الكود من WhatsApp على جوالك"
            }
        
        # محاولة توليد QR جديد
        qr_code = whatsapp_service.generate_qr_code()
        if qr_code:
            return {"qr_code": qr_code, "status": "success"}
        
        return {"status": "loading", "message": "جاري توليد QR Code..."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/whatsapp/disconnect")
async def disconnect_whatsapp(user=Depends(get_admin_user)):
    """
    قطع اتصال WhatsApp (Admin فقط)
    """
    success = whatsapp_service.disconnect()
    if success:
        return {"status": "disconnected", "message": "تم قطع الاتصال"}
    raise HTTPException(status_code=500, detail="فشل قطع الاتصال")

@api_router.post("/whatsapp/test-send")
async def test_send_message(phone: str, message: str = None, user=Depends(get_admin_user)):
    """
    اختبار إرسال رسالة عبر WhatsApp (Admin فقط)
    """
    try:
        import httpx
        
        whatsapp_url = os.environ.get('WHATSAPP_SERVICE_URL', 'http://localhost:8002')
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{whatsapp_url}/test-send",
                json={"phone": phone, "message": message}
            )
            data = response.json()
            
            if response.status_code == 200 and data.get("status") == "sent":
                return {"status": "sent", "message": data.get("message", "تم الإرسال بنجاح")}
            else:
                raise HTTPException(status_code=response.status_code, detail=data.get("message", "فشل الإرسال"))
                
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail="فشل الاتصال بخدمة WhatsApp")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/send-otp")
async def send_otp(phone: str, country_code: str = "+963", current_user: dict = Depends(get_current_user)):
    """
    إرسال كود التحقق عبر WhatsApp - المستخدم يطلبه بنفسه
    فاصل 2 دقيقة بين كل طلب
    """
    try:
        # التحقق من أن المستخدم غير محقق
        if current_user.get("verified", False):
            raise HTTPException(status_code=400, detail="حسابك محقق بالفعل")
        
        # التحقق من الفاصل الزمني (2 دقيقة)
        last_otp_request = current_user.get("last_otp_request")
        if last_otp_request:
            last_request_time = datetime.fromisoformat(last_otp_request.replace('Z', '+00:00'))
            time_diff = datetime.now(timezone.utc) - last_request_time
            if time_diff.total_seconds() < 120:  # 2 دقيقة = 120 ثانية
                remaining = 120 - int(time_diff.total_seconds())
                raise HTTPException(
                    status_code=429, 
                    detail=f"يرجى الانتظار {remaining} ثانية قبل طلب كود جديد"
                )
        
        # التحقق من صحة رقم الهاتف
        full_phone = f"{country_code}{phone}"
        parsed = phonenumbers.parse(full_phone, None)
        if not phonenumbers.is_valid_number(parsed):
            raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")
        
        # التحقق من أن WhatsApp متصل
        if not whatsapp_service.is_connected:
            raise HTTPException(status_code=503, detail="خدمة WhatsApp غير متصلة. يرجى التواصل مع الإدارة")
        
        # تحديث وقت آخر طلب
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"last_otp_request": datetime.now(timezone.utc).isoformat()}}
        )
        
        # إرسال OTP
        success = await whatsapp_service.send_otp(full_phone)
        
        if success:
            return {"status": "sent", "message": "تم إرسال الكود بنجاح إلى WhatsApp الخاص بك"}
        raise HTTPException(status_code=500, detail="فشل إرسال الكود")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send OTP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/verify-otp")
async def verify_otp(data: OTPVerify):
    """
    التحقق من كود OTP
    """
    try:
        # تنظيف رقم الهاتف
        phone = data.phone.replace("+", "").replace(" ", "").replace("-", "")
        
        # التحقق من الكود عبر خدمة WhatsApp
        is_valid = whatsapp_service.verify_otp(phone, data.code)
        
        if is_valid:
            # البحث عن المستخدم بأي صيغة للرقم
            user = await db.users.find_one({
                "$or": [
                    {"phone": phone},
                    {"phone": f"+{phone}"},
                    {"phone": {"$regex": phone[-9:]}}  # آخر 9 أرقام
                ]
            }, {"_id": 0})
            
            if user:
                # تحديث حالة المستخدم
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {"verified": True}}
                )
                return {"status": "verified", "message": "تم التحقق بنجاح! يمكنك الآن استخدام جميع ميزات الموقع"}
            
            return {"status": "verified", "message": "تم التحقق بنجاح"}
        
        raise HTTPException(status_code=400, detail="كود التحقق غير صحيح أو منتهي الصلاحية")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify OTP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/resend-otp")
async def resend_otp(phone: str, country_code: str = "+963"):
    """
    إعادة إرسال كود التحقق
    """
    try:
        full_phone = f"{country_code}{phone}".replace(" ", "").replace("-", "")
        
        # التحقق من أن WhatsApp متصل
        if not whatsapp_service.is_connected:
            raise HTTPException(status_code=503, detail="خدمة WhatsApp غير متصلة. يرجى التواصل مع الإدارة")
        
        # إرسال OTP جديد
        success = await whatsapp_service.send_otp(full_phone)
        if success:
            return {"status": "sent", "message": "تم إرسال كود جديد إلى WhatsApp الخاص بك"}
        
        raise HTTPException(status_code=500, detail="فشل إعادة إرسال الكود")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend OTP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include router at the end after all endpoints are defined
app.include_router(api_router)
