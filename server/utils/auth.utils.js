import "dotenv/config";
import jwt from "jsonwebtoken";

const signToken = async (signableValue) => {
  const token = await jwt.sign(signableValue, process.env.JWT_SECRET, {});

  return token;
};

export { signToken };
