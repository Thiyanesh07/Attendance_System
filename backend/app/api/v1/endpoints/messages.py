from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.services.database import get_db, Base, User
from app.api.v1.endpoints.google_auth import get_current_user

router = APIRouter()

# Database Model
class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender_email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    admin_reply = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    reply_date = Column(DateTime, nullable=True)
    
    sender = relationship("User", backref="messages")

# Pydantic Models
class MessageCreate(BaseModel):
    subject: str
    message: str
    sender_id: int
    sender_email: str

class MessageReply(BaseModel):
    reply: str

class MessageResponse(BaseModel):
    id: int
    sender_id: int
    sender_email: str
    subject: str
    message: str
    admin_reply: Optional[str]
    is_read: bool
    created_at: datetime
    reply_date: Optional[datetime]

    class Config:
        from_attributes = True

@router.post("/send", response_model=MessageResponse)
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message to admin (Student only)
    """
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can send messages"
        )
    
    # Verify sender_id matches current user
    if message_data.sender_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot send message on behalf of another user"
        )
    
    new_message = Message(
        sender_id=message_data.sender_id,
        sender_email=message_data.sender_email,
        subject=message_data.subject,
        message=message_data.message,
        created_at=datetime.utcnow()
    )
    
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    return new_message

@router.get("/admin/all", response_model=List[MessageResponse])
async def get_all_messages_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all messages (Admin only)
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    messages = db.query(Message).order_by(Message.created_at.desc()).all()
    return messages

@router.get("/student/{student_id}", response_model=List[MessageResponse])
async def get_student_messages(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get messages for a specific student
    """
    # Students can only view their own messages
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot view messages of another student"
        )
    
    messages = db.query(Message).filter(
        Message.sender_id == student_id
    ).order_by(Message.created_at.desc()).all()
    
    return messages

@router.put("/{message_id}/read")
async def mark_message_as_read(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a message as read (Admin only)
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    message = db.query(Message).filter(Message.id == message_id).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    message.is_read = True
    db.commit()
    
    return {"message": "Message marked as read"}

@router.post("/{message_id}/reply", response_model=MessageResponse)
async def reply_to_message(
    message_id: int,
    reply_data: MessageReply,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reply to a student message (Admin only)
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    message = db.query(Message).filter(Message.id == message_id).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    message.admin_reply = reply_data.reply
    message.reply_date = datetime.utcnow()
    message.is_read = True
    db.commit()
    db.refresh(message)
    
    return message

@router.delete("/{message_id}")
async def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a message
    - Admin can delete any message
    - Student can only delete their own messages
    """
    message = db.query(Message).filter(Message.id == message_id).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Check permissions
    if current_user.role == "student" and message.sender_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own messages"
        )
    
    db.delete(message)
    db.commit()
    
    return {"message": "Message deleted successfully"}
