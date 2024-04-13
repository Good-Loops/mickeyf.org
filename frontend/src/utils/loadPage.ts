import Home from "../../components/Home";
import User from "../../components/User";
import Games from "../../components/Games";
import Animations from "../../components/Animations";
import SocialMedia from "../../components/SocialMedia";
import Register from "../../components/Register";
import DanceCircles from "../../components/animations/DanceCircles";
import P4Vega from "../../components/games/P4Vega";
import Error404 from "../../components/Error404";

interface routerInterface<T> {
    [id: string]: T;
}

interface componentInterface {
    render: (params?: any) => string | Promise<string>;
    action?: (params?: any) => void;
}

const routes: routerInterface<componentInterface> = {
    "/": Home,
    "/user/signup": Register,
    "/user/:id": User,
    "/games": Games,
    "/animations": Animations,
    "/socialmedia": SocialMedia,
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