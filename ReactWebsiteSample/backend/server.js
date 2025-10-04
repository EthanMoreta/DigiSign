import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe('sk_test_YOUR_SECRET_KEY'); // <-- Replace with your Stripe secret key

app.post('/create-payment-intent', async (req, res) => {
  const { amount } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(5000, () => console.log('Stripe backend running on port 5000'));
