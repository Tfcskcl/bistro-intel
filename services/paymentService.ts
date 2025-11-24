
import { PlanType, RazorpayOptions, RazorpayResponse, User } from '../types';

// Razorpay Live Key ID
const RAZORPAY_KEY_ID = 'rzp_live_RYndnOARtD6tmd'; 

export const paymentService = {
    loadRazorpayScript: (): Promise<boolean> => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    },

    initiatePayment: async (
        user: User, 
        planType: PlanType, 
        amount: number, 
        onSuccess: (paymentId: string) => void,
        onFailure: (error: string) => void
    ) => {
        const isLoaded = await paymentService.loadRazorpayScript();

        if (!isLoaded) {
            onFailure("Razorpay SDK failed to load. Please check your connection.");
            return;
        }

        // In a production environment, you should call your backend to create an Order 
        // using the Key Secret and pass the order_id here for security.
        
        const options: RazorpayOptions = {
            key: RAZORPAY_KEY_ID, 
            amount: amount * 100, // Amount in paise
            currency: 'INR',
            name: 'BistroIntelligence',
            description: `Upgrade to ${planType.replace('_', ' ')} Plan`,
            image: 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png', // Placeholder logo
            handler: function (response: RazorpayResponse) {
                console.log("Payment Successful", response);
                onSuccess(response.razorpay_payment_id);
            },
            prefill: {
                name: user.name,
                email: user.email,
                contact: '9999999999' // Placeholder or user's phone
            },
            notes: {
                plan: planType,
                user_id: user.id
            },
            theme: {
                color: '#10b981' // Emerald-500
            }
        };

        try {
            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (error) {
            console.error("Payment Error", error);
            onFailure("Payment initialization failed.");
        }
    }
};
