import http from "./helpers/http";

function create() {
    return {
        create: async function () {
            try {
                // console.log("chamou");
                const {data} = await http.post("/user/create");
                console.log(data);
            } catch (error) {
                console.log(error);
            }
        },
    };
}

export default create;