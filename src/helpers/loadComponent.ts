import Home from "../../components/Home";
import Register from "../../components/Register";
import User from "../../components/User";
import Error404 from "../../components/Error404";
import DanceCircles from "../../components/DanceCircles";

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
    "/error": Error404
}

const loadComponentHtml = async function (component: string, placeholder: string, uri: string) {
    const content = document.querySelector("#content") as HTMLDivElement;
    const newUri = component + placeholder;
    let componentHtml = routes[uri] ?? routes[newUri];

    if (!componentHtml) componentHtml = Error404;

    content.innerHTML = await componentHtml.render();

    if (componentHtml && componentHtml.action) {
        componentHtml.action();
    }
}

export default loadComponentHtml;