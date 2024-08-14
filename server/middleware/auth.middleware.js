import "dotenv/config";
import prisma from "../prismaClient.js";
import jwt from "jsonwebtoken";

const authGuard = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const { id } = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: {
          username: id,
        },
      });
      req.user = user;
      return next();
    } catch (error) {
      console.log(error);
      let err = new Error("Not authorized, Token failed");
      err.statusCode = 401;
      return next(err);
    }
  } else {
    let error = new Error("Not authorized, No token");
    error.statusCode = 401;
    return next(error);
  }
};

export { authGuard };
