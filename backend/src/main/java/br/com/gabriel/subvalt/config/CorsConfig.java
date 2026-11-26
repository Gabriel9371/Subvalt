package br.com.gabriel.subvalt.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;


@Configuration 
public class CorsConfig implements WebMvcConfigurer{
    @Override 
    public void addCorsMappings(CorsRegistry regs){
        regs.addMapping("/api/**")
            .allowedOrigins("http://localhost:5173")
            .allowedMethods("GET", "POST", "PUT","PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("*");
    }
    
}
