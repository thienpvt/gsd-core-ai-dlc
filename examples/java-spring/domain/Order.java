package com.example.orders.domain;

/**
 * Thin aggregate root for the place-order slice.
 * See JS-DDD-01 / java-spring-ddd-tactical and JS-HEX-01.
 */
public final class Order {
  private final String orderId;
  private final String customerId;
  private final long amountCents;

  public Order(String orderId, String customerId, long amountCents) {
    this.orderId = orderId;
    this.customerId = customerId;
    this.amountCents = amountCents;
  }

  public String orderId() {
    return orderId;
  }

  public String customerId() {
    return customerId;
  }

  public long amountCents() {
    return amountCents;
  }
}
