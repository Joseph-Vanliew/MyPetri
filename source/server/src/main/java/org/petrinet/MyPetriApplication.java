package org.petrinet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class
MyPetriApplication {

    public static void main(String[] args) {
        SpringApplication.run(MyPetriApplication.class, args);
        System.out.println("MyPetriApplication started");
    }

}
