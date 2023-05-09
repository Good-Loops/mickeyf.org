import hashInfo from "../helpers/hashInfo";

function component() {
    const data = function() {
        const { param } = hashInfo();
        return param();
    }

    const render = function() {
        // console.log(data());
        return "User";
    }

    return {
        render,
    };
}

export default component();