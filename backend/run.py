import os
from app import create_app

# Default to development environment
env = os.getenv("FLASK_ENV", "development")
app = create_app(env)

if __name__ == "__main__":
    # In development, run with Flask's built-in server
    app.run(host="0.0.0.0", port=5000, debug=True)
