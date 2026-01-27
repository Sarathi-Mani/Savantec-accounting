"""Notification Service - Email, SMS, and WhatsApp integration."""
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import requests

from app.database.models import Company, User, generate_uuid


class NotificationService:
    """Service for sending notifications via Email, SMS, and WhatsApp."""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ==================== EMAIL SERVICE ====================
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None,
        from_email: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict]] = None,  # [{"filename": "...", "content": bytes}]
        company_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send an email using SMTP.
        
        Args:
            to_email: Recipient email
            subject: Email subject
            body_html: HTML body content
            body_text: Plain text body (optional)
            from_email: Sender email (optional, uses company settings)
            cc: CC recipients
            bcc: BCC recipients
            attachments: List of attachment dicts
            company_id: Company ID for SMTP settings
            
        Returns:
            Dict with status and message_id
        """
        try:
            # Get SMTP settings from company or default
            smtp_config = self._get_smtp_config(company_id)
            
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_email or smtp_config.get("from_email")
            msg["To"] = to_email
            
            if cc:
                msg["Cc"] = ", ".join(cc)
            if bcc:
                msg["Bcc"] = ", ".join(bcc)
            
            # Attach text and HTML
            if body_text:
                msg.attach(MIMEText(body_text, "plain"))
            msg.attach(MIMEText(body_html, "html"))
            
            # Add attachments
            if attachments:
                for attachment in attachments:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(attachment["content"])
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f"attachment; filename={attachment['filename']}"
                    )
                    msg.attach(part)
            
            # Send via SMTP
            with smtplib.SMTP(
                smtp_config.get("host", "smtp.gmail.com"),
                smtp_config.get("port", 587)
            ) as server:
                server.starttls()
                server.login(
                    smtp_config.get("username"),
                    smtp_config.get("password")
                )
                
                recipients = [to_email]
                if cc:
                    recipients.extend(cc)
                if bcc:
                    recipients.extend(bcc)
                
                server.sendmail(
                    from_email or smtp_config.get("from_email"),
                    recipients,
                    msg.as_string()
                )
            
            # Log the notification
            self._log_notification(
                channel="email",
                recipient=to_email,
                subject=subject,
                status="sent",
                company_id=company_id,
            )
            
            return {
                "status": "sent",
                "recipient": to_email,
                "message_id": generate_uuid(),
            }
            
        except Exception as e:
            self._log_notification(
                channel="email",
                recipient=to_email,
                subject=subject,
                status="failed",
                error=str(e),
                company_id=company_id,
            )
            return {
                "status": "failed",
                "error": str(e),
            }
    
    def _get_smtp_config(self, company_id: Optional[str] = None) -> Dict:
        """Get SMTP configuration from company settings or defaults."""
        if company_id:
            company = self.db.query(Company).filter(Company.id == company_id).first()
            if company and hasattr(company, "smtp_settings") and company.smtp_settings:
                return company.smtp_settings
        
        # Default/fallback SMTP config
        return {
            "host": "smtp.gmail.com",
            "port": 587,
            "username": "",
            "password": "",
            "from_email": "noreply@savantec.com",
        }
    
    # ==================== SMS SERVICE ====================
    
    def send_sms(
        self,
        phone_number: str,
        message: str,
        company_id: Optional[str] = None,
        template_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send SMS via provider API.
        
        Args:
            phone_number: Phone number (with country code)
            message: SMS message (max 160 chars for single SMS)
            company_id: Company ID for SMS settings
            template_id: DLT template ID (required in India)
            
        Returns:
            Dict with status and message_id
        """
        try:
            # Get SMS config from company settings
            sms_config = self._get_sms_config(company_id)
            
            # Normalize phone number
            if not phone_number.startswith("+"):
                phone_number = "+91" + phone_number  # Default to India
            
            # SMS provider API call (example with generic API)
            # Replace with actual provider (MSG91, Twilio, etc.)
            response = self._call_sms_api(
                phone=phone_number,
                message=message,
                template_id=template_id,
                config=sms_config,
            )
            
            if response.get("status") == "success":
                self._log_notification(
                    channel="sms",
                    recipient=phone_number,
                    subject=message[:50] + "..." if len(message) > 50 else message,
                    status="sent",
                    company_id=company_id,
                )
                return {
                    "status": "sent",
                    "recipient": phone_number,
                    "message_id": response.get("message_id"),
                }
            else:
                raise Exception(response.get("error", "SMS sending failed"))
            
        except Exception as e:
            self._log_notification(
                channel="sms",
                recipient=phone_number,
                subject=message[:50] + "..." if len(message) > 50 else message,
                status="failed",
                error=str(e),
                company_id=company_id,
            )
            return {
                "status": "failed",
                "error": str(e),
            }
    
    def _get_sms_config(self, company_id: Optional[str] = None) -> Dict:
        """Get SMS provider configuration."""
        if company_id:
            company = self.db.query(Company).filter(Company.id == company_id).first()
            if company and hasattr(company, "sms_settings") and company.sms_settings:
                return company.sms_settings
        
        return {
            "provider": "msg91",
            "api_key": "",
            "sender_id": "SVNTEC",
        }
    
    def _call_sms_api(
        self,
        phone: str,
        message: str,
        template_id: Optional[str],
        config: Dict,
    ) -> Dict:
        """Call SMS provider API."""
        provider = config.get("provider", "msg91")
        
        if provider == "msg91":
            # MSG91 API
            url = "https://api.msg91.com/api/v5/flow/"
            headers = {
                "authkey": config.get("api_key"),
                "content-type": "application/json",
            }
            payload = {
                "flow_id": template_id,
                "mobiles": phone.replace("+91", ""),
                "sender": config.get("sender_id"),
                "message": message,
            }
            
            try:
                response = requests.post(url, json=payload, headers=headers, timeout=10)
                if response.status_code == 200:
                    return {"status": "success", "message_id": generate_uuid()}
                else:
                    return {"status": "failed", "error": response.text}
            except requests.RequestException as e:
                return {"status": "failed", "error": str(e)}
        
        elif provider == "twilio":
            # Twilio API integration placeholder
            return {"status": "failed", "error": "Twilio not configured"}
        
        return {"status": "failed", "error": "Unknown SMS provider"}
    
    # ==================== WHATSAPP SERVICE ====================
    
    def send_whatsapp(
        self,
        phone_number: str,
        template_name: str,
        template_params: Optional[List[str]] = None,
        company_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send WhatsApp message via Business API.
        
        Args:
            phone_number: Phone number (with country code)
            template_name: Pre-approved template name
            template_params: Template parameters
            company_id: Company ID for WhatsApp settings
            
        Returns:
            Dict with status and message_id
        """
        try:
            # Get WhatsApp config
            wa_config = self._get_whatsapp_config(company_id)
            
            # Normalize phone number
            if not phone_number.startswith("+"):
                phone_number = "+91" + phone_number
            
            # WhatsApp Business API call
            response = self._call_whatsapp_api(
                phone=phone_number,
                template_name=template_name,
                template_params=template_params or [],
                config=wa_config,
            )
            
            if response.get("status") == "success":
                self._log_notification(
                    channel="whatsapp",
                    recipient=phone_number,
                    subject=f"Template: {template_name}",
                    status="sent",
                    company_id=company_id,
                )
                return {
                    "status": "sent",
                    "recipient": phone_number,
                    "message_id": response.get("message_id"),
                }
            else:
                raise Exception(response.get("error", "WhatsApp sending failed"))
            
        except Exception as e:
            self._log_notification(
                channel="whatsapp",
                recipient=phone_number,
                subject=f"Template: {template_name}",
                status="failed",
                error=str(e),
                company_id=company_id,
            )
            return {
                "status": "failed",
                "error": str(e),
            }
    
    def _get_whatsapp_config(self, company_id: Optional[str] = None) -> Dict:
        """Get WhatsApp Business API configuration."""
        if company_id:
            company = self.db.query(Company).filter(Company.id == company_id).first()
            if company and hasattr(company, "whatsapp_settings") and company.whatsapp_settings:
                return company.whatsapp_settings
        
        return {
            "provider": "meta",  # Meta Cloud API
            "api_token": "",
            "phone_number_id": "",
            "business_account_id": "",
        }
    
    def _call_whatsapp_api(
        self,
        phone: str,
        template_name: str,
        template_params: List[str],
        config: Dict,
    ) -> Dict:
        """Call WhatsApp Business API."""
        provider = config.get("provider", "meta")
        
        if provider == "meta":
            # Meta Cloud API
            url = f"https://graph.facebook.com/v18.0/{config.get('phone_number_id')}/messages"
            headers = {
                "Authorization": f"Bearer {config.get('api_token')}",
                "Content-Type": "application/json",
            }
            
            # Build template components
            components = []
            if template_params:
                body_params = [{"type": "text", "text": p} for p in template_params]
                components.append({
                    "type": "body",
                    "parameters": body_params,
                })
            
            payload = {
                "messaging_product": "whatsapp",
                "to": phone.replace("+", ""),
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": "en"},
                    "components": components,
                }
            }
            
            try:
                response = requests.post(url, json=payload, headers=headers, timeout=10)
                if response.status_code in [200, 201]:
                    data = response.json()
                    return {
                        "status": "success",
                        "message_id": data.get("messages", [{}])[0].get("id"),
                    }
                else:
                    return {"status": "failed", "error": response.text}
            except requests.RequestException as e:
                return {"status": "failed", "error": str(e)}
        
        elif provider == "interakt":
            # Interakt API placeholder
            return {"status": "failed", "error": "Interakt not configured"}
        
        return {"status": "failed", "error": "Unknown WhatsApp provider"}
    
    # ==================== NOTIFICATION LOGGING ====================
    
    def _log_notification(
        self,
        channel: str,
        recipient: str,
        subject: str,
        status: str,
        error: Optional[str] = None,
        company_id: Optional[str] = None,
    ):
        """Log notification to database."""
        # This would use a NotificationLog model if we create one
        # For now, just print
        print(f"[NOTIFICATION] {channel.upper()} to {recipient}: {status}")
        if error:
            print(f"  Error: {error}")
    
    # ==================== NOTIFICATION TRIGGERS ====================
    
    def send_invoice_notification(
        self,
        company_id: str,
        customer_email: str,
        customer_phone: Optional[str],
        invoice_number: str,
        invoice_total: float,
        due_date: str,
        pdf_attachment: Optional[bytes] = None,
    ) -> Dict[str, Any]:
        """Send invoice notification via email and WhatsApp."""
        results = {}
        
        # Send email
        html_body = f"""
        <html>
        <body>
            <h2>Invoice #{invoice_number}</h2>
            <p>Dear Customer,</p>
            <p>Please find attached your invoice.</p>
            <p><strong>Invoice Total:</strong> ₹{invoice_total:,.2f}</p>
            <p><strong>Due Date:</strong> {due_date}</p>
            <p>Thank you for your business!</p>
        </body>
        </html>
        """
        
        attachments = None
        if pdf_attachment:
            attachments = [{"filename": f"Invoice_{invoice_number}.pdf", "content": pdf_attachment}]
        
        results["email"] = self.send_email(
            to_email=customer_email,
            subject=f"Invoice #{invoice_number}",
            body_html=html_body,
            attachments=attachments,
            company_id=company_id,
        )
        
        # Send WhatsApp if phone provided
        if customer_phone:
            results["whatsapp"] = self.send_whatsapp(
                phone_number=customer_phone,
                template_name="invoice_notification",
                template_params=[invoice_number, f"₹{invoice_total:,.2f}", due_date],
                company_id=company_id,
            )
        
        return results
    
    def send_quotation_notification(
        self,
        company_id: str,
        customer_email: str,
        customer_phone: Optional[str],
        quotation_number: str,
        quotation_total: float,
        validity_date: str,
        pdf_attachment: Optional[bytes] = None,
    ) -> Dict[str, Any]:
        """Send quotation notification via email and WhatsApp."""
        results = {}
        
        html_body = f"""
        <html>
        <body>
            <h2>Quotation #{quotation_number}</h2>
            <p>Dear Customer,</p>
            <p>Thank you for your enquiry. Please find attached our quotation.</p>
            <p><strong>Quotation Total:</strong> ₹{quotation_total:,.2f}</p>
            <p><strong>Valid Until:</strong> {validity_date}</p>
            <p>We look forward to your business!</p>
        </body>
        </html>
        """
        
        attachments = None
        if pdf_attachment:
            attachments = [{"filename": f"Quotation_{quotation_number}.pdf", "content": pdf_attachment}]
        
        results["email"] = self.send_email(
            to_email=customer_email,
            subject=f"Quotation #{quotation_number}",
            body_html=html_body,
            attachments=attachments,
            company_id=company_id,
        )
        
        if customer_phone:
            results["whatsapp"] = self.send_whatsapp(
                phone_number=customer_phone,
                template_name="quotation_notification",
                template_params=[quotation_number, f"₹{quotation_total:,.2f}", validity_date],
                company_id=company_id,
            )
        
        return results
    
    def send_payment_reminder(
        self,
        company_id: str,
        customer_email: str,
        customer_phone: Optional[str],
        invoice_number: str,
        balance_due: float,
        days_overdue: int,
    ) -> Dict[str, Any]:
        """Send payment reminder notification."""
        results = {}
        
        html_body = f"""
        <html>
        <body>
            <h2>Payment Reminder</h2>
            <p>Dear Customer,</p>
            <p>This is a friendly reminder that payment for Invoice #{invoice_number} is pending.</p>
            <p><strong>Balance Due:</strong> ₹{balance_due:,.2f}</p>
            <p><strong>Days Overdue:</strong> {days_overdue} days</p>
            <p>Please make the payment at your earliest convenience.</p>
        </body>
        </html>
        """
        
        results["email"] = self.send_email(
            to_email=customer_email,
            subject=f"Payment Reminder - Invoice #{invoice_number}",
            body_html=html_body,
            company_id=company_id,
        )
        
        if customer_phone:
            results["sms"] = self.send_sms(
                phone_number=customer_phone,
                message=f"Payment reminder: Invoice #{invoice_number}, Due: Rs.{balance_due:,.0f}, Overdue: {days_overdue} days. Please pay soon.",
                company_id=company_id,
            )
        
        return results
