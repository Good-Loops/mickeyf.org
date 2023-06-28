import Home from "../../pages/Home";
import Register from "../../pages/Register";
import User from "../../pages/User";
import Error404 from "../../pages/Error404";
import DanceCircles from "../../pages/animations/DanceCircles";
import P4Vega from "../../pages/games/P4Vega";

interface routerInterface<T> {
    [id: string]: T;
}

interface componentInterface {
    render: () => string | Promise<string>;
    action?: () => void;
}

const routes: routerInterface<componentInterface> = {
    "/": Home,
    "/user/register": Register,
    "/user/:id": User,
    "/dancing-circles": DanceCircles,
    "/p4-Vega": P4Vega,
    "/error": Error404
}

const loadPageHtml = async function (component: string, placeholder: string, uri: string) {
    const content = document.querySelector("#content") as HTMLDivElement;
    const newUri = component + placeholder;
    let componentHtml = routes[uri] ?? routes[newUri];

    if (!componentHtml) componentHtml = Error404;

    content.innerHTML = await componentHtml.render();

    if (componentHtml && componentHtml.action) {
        componentHtml.action();
    }
}

export default loadPageHtml;