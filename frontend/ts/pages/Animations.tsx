/**
 * Animations index page ("/animations").
 * Provides navigation to interactive animation experiences.
 */
import React from "react";
import { Link } from "react-router-dom";

const Animations: React.FC = () => {
    return (
        <section className="animations">
            <h1 className="animations__title">Animations</h1>
            <div className="animations__grid">
                <div className="animations__grid-item">
                    <Link to="/animations/dancing-circles">
                        <h3 className="animations__grid-item--dancing-circles floating">Dancing Circles</h3>
                    </Link>
                </div> 
                <div className="animations__grid-item">
                    <Link to="/animations/dancing-fractals">
                        <h3 className="animations__grid-item--dancing-circles floating">Dancing Fractals</h3>
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default Animations;