const hashInfo = function () {
    const hash = window.location.hash;
    const hashSplit = hash.split("/");

    const component = hashSplit[1] ? `/${hashSplit[1]}` : "/";
    const placeholder = hashSplit[2] ? "/:id" : "";

    const param = function (index: number = 2) {
        return hashSplit[index] ?? "";
    }

    const uri = hash.substring(1);

    return {
        component,
        placeholder,
        uri,
        param
    };
};

export default hashInfo;