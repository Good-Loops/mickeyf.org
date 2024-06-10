// For toggling the active class of a dropdown element 
// and setting the selected key text content to the selected key
export default class Dropdown {
    // The toggle method toggles the active class of a dropdown element
    public static toggle = (event: Event): void => {
        // Check if the event target is a dropdown button, selected element, or a dropdown element
        const isDropdownBtn: boolean = (event.target as Element).matches('[data-dropdown-btn]')
                                        || (event.target as Element).matches('[data-dropdown]')
                                        || (event.target as Element).matches('[data-selected-key]')
                                        || (event.target as Element).matches('[data-selected-scale]');

        // If the event target is not a dropdown button, selected key element, or a dropdown element
        // and the target is not null, return
        // This is a guard clause to prevent the function from running when the event target is not related to a dropdown
        if (!isDropdownBtn && (event.target as Element).closest('[data-dropdown]') !== null) return;

        // Get the closest dropdown element to the event target
        let currentDropdown: Element = (event.target as Element).closest('[data-dropdown]') as Element;

        const allDropdowns: NodeListOf<Element> = document.querySelectorAll('[data-dropdown]');
        allDropdowns.forEach(dropdown => {
            if (dropdown === currentDropdown) {
                // Toggle the active class only for the clicked dropdown
                dropdown.classList.toggle('active');
            } else {
                // Remove the active class for all other dropdowns
                dropdown.classList.remove('active');
            }
        });
    }

    // The toggleKeySelection method sets the selected key text content to the selected key
    public static toggleKeySelection = (event: Event): void => {
        // Get the selected key as a string from the event target
        const selectedKey: string = (event.target as Element).getAttribute('data-key') as string;
        // Get the dropdown element
        const dropdown: Element = document.querySelector('[data-dropdown]') as Element;

        // If there is a selected key, set the selected key 
        // text content to the selected key
        if (selectedKey) {
            document.querySelector('[data-selected-key]')!.textContent = selectedKey;
            dropdown.classList.remove('active');
        }
    }

    public static toggleScaleSelection = (event: Event): void => {
        console.log('toggleScaleSelection called'); 
        // Get the selected scale as a string from the event target
        const selectedScale: string = (event.target as Element).getAttribute('data-scale') as string;
        console.log('selectedScale:', selectedScale); 
        // Get the dropdown element
        const dropdown: Element = document.querySelector('[data-dropdown]') as Element;
        console.log('dropdown:', dropdown);

        // If there is a selected scale, set the selected scale 
        // text content to the selected scale
        if (selectedScale) {
            document.querySelector('[data-selected-scale]')!.textContent = selectedScale;
            dropdown.classList.remove('active');
            console.log('dropdown active class removed');
        }
    }
}