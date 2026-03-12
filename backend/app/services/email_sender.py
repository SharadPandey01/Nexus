# ============================================================================
# NEXUS BACKEND — Email Sending Service
# ============================================================================
# Executes the actual dispatch of emails.
# By default, it runs in "Mock Mode" purely logging outputs so we
# don't accidentally spam people during the hackathon/demo.
#
# If EMAIL_REAL_SEND=true in .env, it utilizes aiosmtplib to connect
# to an external mail server.
# ============================================================================

import logging
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, body: str) -> Dict[str, Any]:
    """
    Main dispatch wrapper for an email.
    Checks environment config to decide whether to truly send over SMTP
    or just print a formatted log statement.
    
    Args:
        to: Recipient email address
        subject: Final email subject line
        body: Final rendered body content
        
    Returns:
        Dict indicating status info and the result of the attempt
    """
    if settings.EMAIL_REAL_SEND:
        return await _send_real(to, subject, body)
    else:
        return _send_mock(to, subject, body)


def _send_mock(to: str, subject: str, body: str) -> Dict[str, Any]:
    """
    Demo/Fallback mode. Logs out the email attempt instead of sending.
    Safe for local testing and prevents accidental spam.
    """
    logger.info(f"📧 [MOCK] Email to: {to} | Subject: {subject}")
    # You could print the body here during debugging, 
    # but that gets chaotic for bulk sends.
    
    return {
        "status": "sent_mock",
        "to": to,
        "subject": subject,
        "message": "Email logged (mock mode). Set EMAIL_REAL_SEND=true for real sending.",
    }


async def _send_real(to: str, subject: str, body: str) -> Dict[str, Any]:
    """
    Real SMTP dispatch function.
    Requires the 'aiosmtplib' python library. 
    Connects to the credentials provided in the .env file.
    """
    try:
        # Import dynamically so the app doesn't crash if the library 
        # isn't installed when running in mock mode.
        import aiosmtplib
        from email.message import EmailMessage

        # Construct the MIME message
        msg = EmailMessage()
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)

        # Connect and fire
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME or None,
            password=settings.SMTP_PASSWORD or None,
        )
        return {"status": "sent", "to": to, "subject": subject}

    except ImportError:
        logger.warning("aiosmtplib not installed — falling back to mock mode")
        return _send_mock(to, subject, body)
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        # Always return structured errors rather than crashing the orchestrator
        return {"status": "error", "to": to, "error": str(e)}


async def send_batch(emails: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Process a finalized list of emails, sending them out sequentially.
    
    Args:
        emails: A list of dicts containing 'to', 'subject', and 'body'
        
    Returns:
        A rollup summary of the batch job (counts of success vs errors)
    """
    results = []
    sent = 0
    failed = 0

    for email in emails:
        result = await send_email(email["to"], email["subject"], email["body"])
        results.append(result)
        
        # Track metrics 
        if "error" in result.get("status", ""):
            failed += 1
        else:
            sent += 1

    return {
        "total": len(emails), 
        "sent": sent, 
        "failed": failed, 
        "results": results
    }
