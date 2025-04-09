package org.petrinet.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {
    
    @GetMapping(value = {"/"})
    public String index() {
        return "forward:/index.html";
    }
    
    // Handle single-page routes
    @GetMapping(value = {"/canvas/**", "/settings/**", "/help/**"})
    public String forwardToIndex() {
        return "forward:/index.html";
    }
}