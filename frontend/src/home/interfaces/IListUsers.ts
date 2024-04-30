export default interface IListUsers {
    data: object[],
    list: () => void,
    navigateToUser: (event: Event) => void
}