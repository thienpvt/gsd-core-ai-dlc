package com.example.orders.adapter.in.web;

import com.example.orders.application.port.PlaceOrderPort;
import com.example.orders.domain.Order;
import com.example.orders.domain.PlaceOrderCommand;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Thin REST inbound adapter — validate/map boundary, call input port only.
 * See JS-IN-01 / java-spring-inbound-rest.
 */
@RestController
public class PlaceOrderController {
  private final PlaceOrderPort placeOrder;

  public PlaceOrderController(PlaceOrderPort placeOrder) {
    this.placeOrder = placeOrder;
  }

  @PostMapping("/api/v1/orders")
  public PlaceOrderResponse place(@RequestBody PlaceOrderRequest body) {
    if (body == null || body.customerId() == null || body.customerId().isBlank()) {
      throw new IllegalArgumentException("customerId required");
    }
    Order order = placeOrder.place(new PlaceOrderCommand(body.customerId(), body.amountCents()));
    return new PlaceOrderResponse(order.orderId(), order.customerId(), order.amountCents());
  }

  /** Boundary request DTO — not a domain type. */
  public record PlaceOrderRequest(String customerId, long amountCents) {}

  /** Boundary response DTO — not a domain type (JS-IN-01). */
  public record PlaceOrderResponse(String orderId, String customerId, long amountCents) {}
}
