// import getUserData from "../utils/getUserData";

// NOT BEING USED
// function component() {
//     const user = async function (id: string) {

//         const data = await getUserData();

//         const numericId = parseInt(id, 10);
//         if (isNaN(numericId)) {
//             throw new Error('Invalid id');
//         }

//         const userData = data.find((user: { user_id: number; }) => user.user_id === numericId);

//         if (!userData) {
//             throw new Error('User not found');
//         }

//         return userData;
//     }

//     const render = async function (params: { id: string }) {
//         try {
//             const userData = await user(params.id);

//             return /*html*/`
//                 <div>
//                     Hello ${userData.user_name}
//                 </div>
//             `;
//         } catch (error) {
//             // Redirect or handle errors
//             console.error(error);
//             return /*html*/`<div>User not found</div>`;
//         }
//     }

//     return {
//         render
//     };
// }

// export default component();