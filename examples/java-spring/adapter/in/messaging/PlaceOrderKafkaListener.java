package com.example.orders.adapter.in.messaging;

import com.example.orders.application.port.PlaceOrderPort;
import com.example.orders.domain.PlaceOrderCommand;
import org.springframework.kafka.annotation.KafkaListener;

/**
 * Kafka inbound adapter — map payload → input port.
 * Consumer must own: idempotency key store, retry policy, and DLQ routing.
 * See JS-IN-02 / java-spring-inbound-kafka.
 */
public class PlaceOrderKafkaListener {
  private final PlaceOrderPort placeOrder;

  public PlaceOrderKafkaListener(PlaceOrderPort placeOrder) {
    this.placeOrder = placeOrder;
  }

  @KafkaListener(topics = "orders.place")
  public void onMessage(PlaceOrderMessage payload) {
    // idempotency: reject/skip duplicate message keys before calling the port
    // retry: transient failures re-delivered by the consumer config
    // DLQ: poison messages after max retries land on orders.place.dlq
    placeOrder.place(new PlaceOrderCommand(payload.customerId(), payload.amountCents()));
  }

  public record PlaceOrderMessage(String customerId, long amountCents) {}
}
