
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

        // Configuration for Razorpay
        // Using 'any' for options to support 'modal' property without modifying global types
        const options: any = {
            key: RAZORPAY_KEY_ID, 
            amount: amount * 100, // Amount in paise
            currency: 'INR',
            name: 'BistroIntelligence',
            description: `Upgrade to ${planType.replace('_', ' ')} Plan`,
            image: 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png',
            handler: function (response: RazorpayResponse) {
                console.log("Payment Successful", response);
                onSuccess(response.razorpay_payment_id);
            },
            prefill: {
                name: user.name,
                email: user.email,
                // Contact omitted to allow user to enter their own phone number
            },
            notes: {
                plan: planType,
                user_id: user.id
            },
            theme: {
                color: '#10b981' // Emerald-500
            },
            modal: {
                ondismiss: function() {
                    onFailure("Payment process cancelled");
                }
            }
        };

        try {
            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any){
                console.error(response.error);
                onFailure(response.error.description || "Payment Failed");
            });
            rzp.open();
        } catch (error) {
            console.error("Payment Error", error);
            onFailure("Payment initialization failed.");
        }
    }
};
