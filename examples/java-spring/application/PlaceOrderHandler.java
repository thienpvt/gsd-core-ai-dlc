package com.example.orders.application;

import com.example.orders.application.port.OrderRepositoryPort;
import com.example.orders.application.port.PlaceOrderPort;
import com.example.orders.domain.Order;
import com.example.orders.domain.PlaceOrderCommand;
import java.util.UUID;

/**
 * Application handler: depends only on the output port.
 * No Spring stereotypes — keep framework types in adapters.
 */
public final class PlaceOrderHandler implements PlaceOrderPort {
  private final OrderRepositoryPort orders;

  public PlaceOrderHandler(OrderRepositoryPort orders) {
    this.orders = orders;
  }

  @Override
  public Order place(PlaceOrderCommand command) {
    Order order =
        new Order(UUID.randomUUID().toString(), command.customerId(), command.amountCents());
    orders.save(order);
    return order;
  }
}
