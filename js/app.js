// Navigation Logic Mobile First
document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', (e) => {
        // Reset active classes
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        
        // Set new active
        const target = button.currentTarget;
        target.classList.add('active');
        document.getElementById(target.dataset.target).classList.add('active');
        document.getElementById('page-title').innerText = target.querySelector('.label').innerText;
    });
});

// Toast Notifier
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// Modal Handlers
const modalCustomer = document.getElementById('modal-customer');
document.getElementById('btn-add-customer').addEventListener('click', () => modalCustomer.classList.add('active'));
document.querySelector('.close-modal').addEventListener('click', () => modalCustomer.classList.remove('active'));
