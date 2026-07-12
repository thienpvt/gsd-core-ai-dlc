package com.example.orders.application.port;

import com.example.orders.domain.Order;

/** Output port for persisting orders (driven by the application). */
public interface OrderRepositoryPort {
  void save(Order order);
}
