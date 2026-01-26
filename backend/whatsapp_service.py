"""
WhatsApp Service Client
يتصل بخدمة WhatsApp Web الحقيقية (Node.js)
"""

import httpx
import logging
import os
from typing import Optional, Dict

logger = logging.getLogger(__name__)

# استخدام متغير البيئة أو القيمة الافتراضية
WHATSAPP_SERVICE_URL = os.environ.get("WHATSAPP_SERVICE_URL", "http://localhost:8002")

class WhatsAppServiceClient:
    """
    عميل للاتصال بخدمة WhatsApp Web
    """
    
    def __init__(self, base_url: str = WHATSAPP_SERVICE_URL):
        self.base_url = base_url
        self._client = httpx.AsyncClient(timeout=30.0)
    
    @property
    def is_connected(self) -> bool:
        """التحقق من حالة الاتصال"""
        try:
            response = httpx.get(f"{self.base_url}/status", timeout=5.0)
            data = response.json()
            return data.get("connected", False)
        except Exception as e:
            logger.error(f"Error checking WhatsApp status: {e}")
            return False
    
    def get_status(self) -> Dict:
        """الحصول على حالة الخدمة"""
        try:
            response = httpx.get(f"{self.base_url}/status", timeout=5.0)
            return response.json()
        except Exception as e:
            logger.error(f"Error getting WhatsApp status: {e}")
            return {
                "connected": False,
                "authenticated": False,
                "hasQR": False,
                "error": str(e)
            }
    
    def generate_qr_code(self) -> Optional[str]:
        """توليد QR Code جديد"""
        try:
            response = httpx.post(f"{self.base_url}/generate-qr", timeout=60.0)
            data = response.json()
            
            if data.get("status") == "already_connected":
                return None  # متصل بالفعل
            
            return data.get("qr_code")
        except Exception as e:
            logger.error(f"Error generating QR code: {e}")
            raise Exception(f"فشل توليد QR Code: {e}")
    
    def get_qr_code(self) -> Dict:
        """الحصول على QR Code الحالي"""
        try:
            response = httpx.get(f"{self.base_url}/qr", timeout=10.0)
            return response.json()
        except Exception as e:
            logger.error(f"Error getting QR code: {e}")
            return {"status": "error", "message": str(e)}
    
    def disconnect(self) -> bool:
        """قطع الاتصال"""
        try:
            response = httpx.post(f"{self.base_url}/disconnect", timeout=10.0)
            return response.json().get("status") == "disconnected"
        except Exception as e:
            logger.error(f"Error disconnecting: {e}")
            return False
    
    async def send_otp(self, phone: str, code: str = None) -> bool:
        """إرسال OTP عبر WhatsApp"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/send-otp",
                    json={"phone": phone}
                )
                data = response.json()
                return data.get("status") == "sent"
        except Exception as e:
            logger.error(f"Error sending OTP: {e}")
            return False
    
    def verify_otp(self, phone: str, code: str) -> bool:
        """التحقق من OTP"""
        try:
            response = httpx.post(
                f"{self.base_url}/verify-otp",
                json={"phone": phone, "code": code},
                timeout=10.0
            )
            data = response.json()
            return data.get("status") == "verified"
        except Exception as e:
            logger.error(f"Error verifying OTP: {e}")
            return False
    
    def generate_otp(self, phone: str) -> str:
        """هذه الدالة لا تُستخدم - OTP يُولّد في خدمة Node.js"""
        return ""
    
    def resend_otp(self, phone: str) -> Optional[str]:
        """إعادة إرسال OTP"""
        try:
            response = httpx.post(
                f"{self.base_url}/resend-otp",
                json={"phone": phone},
                timeout=30.0
            )
            return response.json().get("status") == "sent"
        except Exception as e:
            logger.error(f"Error resending OTP: {e}")
            return None


# Instance عام
whatsapp_service = WhatsAppServiceClient()
