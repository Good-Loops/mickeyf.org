import Home from "../components/Home";
import Register from "../components/Register";
import User from "../components/User";
import Error404 from "../components/Error404";

interface routerInterface<T> {
    [id: string]: T;
}

interface componentInterface {
    render: () => string;
}

const routes: routerInterface<componentInterface> = {
    "/": Home,
    "/user/create": Register,
    "/user/:id": User,
}

const loadComponentHtml = function (component: string, placeholder: string, uri: string) {
    const content = document.querySelector("#content") as HTMLDivElement;
    const newUri = component + placeholder;
    let componentHtml = routes[uri] ?? routes[newUri];

    if (!componentHtml) {
        componentHtml = Error404;
    } else {
        content.innerHTML = componentHtml.render();
    }
}

export default loadComponentHtml;