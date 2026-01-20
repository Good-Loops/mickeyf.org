/**
 * Not-found route (catch-all).
 * Rendered when no client-side route matches.
 */
import React from "react";

const NotFound: React.FC = () => {
    return (
        <h1>Error 404: Page not found</h1>   
    );
}

export default NotFound;