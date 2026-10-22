 
export function requireLogin(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({
      message: "Please log in to continue."
    });
  }

  next();
}

export function requireAdmin(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({
      message: "Please log in to continue."
    });
  }

  if (req.session.user.role !== "admin") {
    return res.status(403).json({ 
      message: "Admin access required."
    });
  }

  next();
}
