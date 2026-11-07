import Razorpay from 'razorpay'

const instance = new Razorpay({
  key_id: process.env.razorpay_key_id as string,
  key_secret: process.env.razorpay_key_secret as string,
})

export default instance

