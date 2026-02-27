import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Tasks component that redirects to Projects page
 *
 * Since tasks are now accessed only through projects, this component redirects users
 * to the projects page where they can select a project to see its tasks.
 */
export default function Tasks() {
  const navigate = useNavigate();

  // Redirect to projects page when component mounts
  useEffect(() => {
    navigate("/projects");
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Redirecting to Projects...</h1>
        <p className="text-muted-foreground">
          Tasks are now managed within projects. You'll be redirected momentarily.
        </p>
      </div>
    </div>
  );
}
