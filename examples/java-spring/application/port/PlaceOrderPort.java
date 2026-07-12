package com.example.orders.application.port;

import com.example.orders.domain.Order;
import com.example.orders.domain.PlaceOrderCommand;

/** Input port for placing an order (application boundary). */
public interface PlaceOrderPort {
  Order place(PlaceOrderCommand command);
}
