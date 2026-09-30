package com.ledger.dto;

public class ChatResponse {
    private String reply;
    private String error;
    private boolean transactionCreated = false;
    private Long transactionId;

    public ChatResponse() {
    }

    public ChatResponse(String reply, String error) {
        this.reply = reply;
        this.error = error;
    }

    public ChatResponse(String reply, String error, boolean transactionCreated, Long transactionId) {
        this.reply = reply;
        this.error = error;
        this.transactionCreated = transactionCreated;
        this.transactionId = transactionId;
    }

    public static ChatResponse success(String reply) {
        return new ChatResponse(reply, null);
    }

    public static ChatResponse transactionSuccess(String reply, Long transactionId) {
        return new ChatResponse(reply, null, true, transactionId);
    }

    public static ChatResponse error(String error) {
        return new ChatResponse(null, error);
    }

    public String getReply() {
        return reply;
    }

    public void setReply(String reply) {
        this.reply = reply;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public boolean isTransactionCreated() {
        return transactionCreated;
    }

    public void setTransactionCreated(boolean transactionCreated) {
        this.transactionCreated = transactionCreated;
    }

    public Long getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(Long transactionId) {
        this.transactionId = transactionId;
    }
}
