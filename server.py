from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import jwt, datetime, requests, os
import razorpay

app = FastAPI()

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- ENV ----------------
SECRET = os.getenv("SECRET_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
RAZORPAY_KEY = os.getenv("RAZORPAY_KEY")
RAZORPAY_SECRET = os.getenv("RAZORPAY_SECRET")

client = razorpay.Client(auth=(RAZORPAY_KEY, RAZORPAY_SECRET))

# ---------------- DATABASE ----------------
users = {}
wallets = {}
subscriptions = {}
tools_usage = {}
withdraw_requests = []

# ---------------- 25 TOOLS ----------------
BASIC_TOOLS = {
    "blog": "Write blog",
    "caption": "Instagram captions",
    "hashtags": "Generate hashtags",
    "email": "Professional email",
    "script": "YouTube script",
    "product": "Product description",
    "seo": "SEO keywords",
    "bio": "Instagram bio",
    "ads": "Facebook ads",
    "story": "Short story",
}

ADVANCED_TOOLS = {
    "reel": "Instagram reel script",
    "tweet": "Viral tweets",
    "linkedin": "LinkedIn post",
    "ebook": "Ebook generator",
    "title": "Catchy titles",
    "description": "YouTube description",
    "tagline": "Brand tagline",
    "review": "Product review",
    "faq": "FAQs",
    "hook": "Hooks",
    "landing": "Landing page",
    "marketing": "Marketing strategy",
    "coldmail": "Cold email",
    "business": "Business idea",
    "motivation": "Motivational content",
}

# ---------------- MARKETPLACE ----------------
marketplace = [
    {"id": 1, "title": "Instagram Growth Guide", "price": 99},
    {"id": 2, "title": "YouTube Script Pack", "price": 149},
    {"id": 3, "title": "Hashtag Bundle", "price": 199},
    {"id": 4, "title": "Affiliate Ebook", "price": 399},
    {"id": 5, "title": "Business Starter Kit", "price": 599},
]

# ---------------- MODELS ----------------
class AuthModel(BaseModel):
    email: str
    password: str

class ToolModel(BaseModel):
    tool_id: str
    prompt: str

class WithdrawModel(BaseModel):
    amount: int

class PaymentVerify(BaseModel):
    user: str
    plan: str

# ---------------- AUTH ----------------
def create_token(email):
    return jwt.encode({
        "user": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, SECRET, algorithm="HS256")

@app.post("/auth/register")
def register(data: AuthModel):
    if data.email in users:
        raise HTTPException(400, "User exists")

    users[data.email] = data.password
    wallets[data.email] = 0
    subscriptions[data.email] = "free"
    tools_usage[data.email] = 0

    return {"message": "registered"}

@app.post("/auth/login")
def login(data: AuthModel):
    if users.get(data.email) != data.password:
        raise HTTPException(400, "Invalid login")

    return {
        "access_token": create_token(data.email),
        "refresh_token": create_token(data.email)
    }

# ---------------- AI ----------------
def generate_ai(prompt):
    try:
        res = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}",
            json={"contents": [{"parts": [{"text": prompt}]}]}
        )
        return res.json()["candidates"][0]["content"]["parts"][0]["text"]
    except:
        return "AI Error"

# ---------------- TOOLS ----------------
@app.get("/tools")
def get_tools():
    return {"basic": BASIC_TOOLS, "advanced": ADVANCED_TOOLS}

@app.post("/tools/generate")
def generate(data: ToolModel):
    user = "demo"

    if subscriptions[user] == "free":
        if tools_usage[user] >= 3:
            raise HTTPException(403, "Free trial ended")
        tools_usage[user] += 1

    if data.tool_id in ADVANCED_TOOLS and subscriptions[user] == "free":
        raise HTTPException(403, "Premium required")

    result = generate_ai(f"{data.tool_id}: {data.prompt}")
    return {"output": result}

# ---------------- DASHBOARD ----------------
@app.get("/dashboard/full")
def dashboard():
    user = "demo"
    return {
        "is_premium": subscriptions[user] != "free",
        "total_uses": tools_usage[user],
        "remaining_uses": max(0, 3 - tools_usage[user]),
        "wallet_balance": wallets[user],
        "recent_activity": []
    }

# ---------------- SUBSCRIPTION ----------------
@app.get("/subscription/plans")
def plans():
    return [
        {"id": "1m", "price": 299},
        {"id": "3m", "price": 799},
        {"id": "6m", "price": 1499},
        {"id": "1y", "price": 2999},
    ]

@app.post("/subscription/buy")
def buy():
    subscriptions["demo"] = "premium"
    return {"status": "activated"}

# ---------------- PAYMENT ----------------
@app.post("/payment/create-order")
def create_order(plan: str):
    plans = {"1m": 29900, "3m": 79900, "6m": 149900, "1y": 299900}

    if plan not in plans:
        raise HTTPException(400, "Invalid plan")

    return client.order.create({
        "amount": plans[plan],
        "currency": "INR",
        "payment_capture": 1
    })

@app.post("/payment/verify")
def verify(data: PaymentVerify):
    subscriptions[data.user] = "premium"
    return {"status": "premium activated"}

# ---------------- WALLET ----------------
@app.get("/wallet/balance")
def wallet():
    return {"balance": wallets["demo"]}

@app.post("/wallet/topup")
def topup(amount: int):
    wallets["demo"] += amount
    return {"balance": wallets["demo"]}

# ---------------- WITHDRAW ----------------
@app.post("/withdraw/request")
def withdraw(data: WithdrawModel):
    if wallets["demo"] < data.amount:
        raise HTTPException(400, "Insufficient")

    wallets["demo"] -= data.amount
    withdraw_requests.append(data.amount)

    return {"status": "requested"}

# ---------------- MARKETPLACE ----------------
@app.get("/marketplace/products")
def products():
    return marketplace

@app.post("/marketplace/purchase/{product_id}")
def purchase(product_id: int):
    product = next((p for p in marketplace if p["id"] == product_id), None)

    if not product:
        raise HTTPException(404, "Not found")

    if wallets["demo"] < product["price"]:
        raise HTTPException(400, "Not enough money")

    wallets["demo"] -= product["price"]

    return {"status": "purchased", "product": product}

# ---------------- ADMIN ----------------
@app.get("/admin/stats")
def admin():
    return {
        "users": len(users),
        "revenue": sum(wallets.values())
    }