package com.example.orders.domain;

/** Immutable-shaped command consumed by the place-order input port. */
public final class PlaceOrderCommand {
  private final String customerId;
  private final long amountCents;

  public PlaceOrderCommand(String customerId, long amountCents) {
    this.customerId = customerId;
    this.amountCents = amountCents;
  }

  public String customerId() {
    return customerId;
  }

  public long amountCents() {
    return amountCents;
  }
}
