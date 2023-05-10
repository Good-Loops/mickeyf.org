import hashInfo from "../helpers/hashInfo";

function component() {
    const render = function() {
        return `
            <form id="formCreateUser">
                <input id="firstName"></input>

                <button type="submit">Create</button>
            </form>
        `;
    }

    const action = function() {
        const btnCreate = document.querySelector("#formCreateUser") as HTMLFormElement;
        const firstName = document.querySelector("#firstName") as HTMLInputElement;

        btnCreate.addEventListener("submit", (event) => {
            event.preventDefault();
            console.log("create", firstName.value);
        })
    }

    return {
        render,
        action,
    };
}

export default component();