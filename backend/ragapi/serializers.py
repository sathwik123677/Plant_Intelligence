from rest_framework import serializers

from .models import ChatMessage, Document


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = [
            "id",
            "original_name",
            "status",
            "num_chunks",
            "error_message",
            "uploaded_at",
        ]


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "session_id", "role", "content", "sources", "created_at"]
