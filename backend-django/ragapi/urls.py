from django.urls import path

from . import views

urlpatterns = [
    path("documents/upload/", views.upload_document),
    path("documents/", views.list_documents),
    path("documents/<int:pk>/", views.document_detail),
    path("documents/clear/", views.clear_documents),
    path("chat/", views.chat_endpoint),
    path("chat/history/", views.chat_history),
    path("graph/query/", views.graph_query),
    path("graph/summary/", views.graph_summary),
]
