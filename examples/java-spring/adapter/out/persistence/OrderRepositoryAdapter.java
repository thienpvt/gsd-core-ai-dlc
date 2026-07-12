package com.example.orders.adapter.out.persistence;

import com.example.orders.application.port.OrderRepositoryPort;
import com.example.orders.domain.Order;

/**
 * Persistence outbound adapter implementing the output port.
 *
 * ponytail: no JPA/JDBC driver here — ceiling is the port contract only.
 * Upgrade path: consumer adds Spring Data repository / EntityManager mapping.
 */
public class OrderRepositoryAdapter implements OrderRepositoryPort {
  @Override
  public void save(Order order) {
    // intentionally empty — consumer wires real persistence
  }
}
