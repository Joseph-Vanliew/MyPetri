package org.petrinet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class PatsApplication {

    public static void main(String[] args) {
        SpringApplication.run(PatsApplication.class, args);
        System.out.println("PatsApplication started");
    }

}
