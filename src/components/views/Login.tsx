// src/components/views/Login.tsx
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { ClipLoader as Loader } from "react-spinners";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Eye, EyeClosed } from "lucide-react";
import Logo from "../element/Logo";
import { toast } from "sonner";
import { decodeToken } from "@/api";

export default function Login() {
  const { login, loggedIn } = useAuth();
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  const STORE_OUT_ONLY = ["S07632", "S08088"];
  const APPROVE_INDENT_ONLY = "S00116";

  useEffect(() => {
    if (loggedIn) {
      const token = localStorage.getItem("token");
      if (token) {
        const decoded = decodeToken(token) as
          | { role?: string; employee_id?: string }
          | null;

        if (decoded?.employee_id) {
          const emp = decoded.employee_id;
          if (STORE_OUT_ONLY.includes(emp)) {
            navigate("/store-out-approval", { replace: true });
            return;
          }
          if (emp === APPROVE_INDENT_ONLY) {
            // ✅ fixed path
            navigate("/approve-indent-data", { replace: true });
            return;
          }
        }

        if (decoded?.role === "admin") navigate("/dashboard", { replace: true });
        else navigate("/user-indent", { replace: true });
      } else {
        navigate("/");
      }
    }
  }, [loggedIn, navigate]);

  const schema = z.object({
    username: z.string().nonempty("Username is required"),
    password: z.string().nonempty("Password is required"),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      const success = await login(values.username, values.password);
      if (!success) {
        toast.error("Invalid Username or Password");
        return;
      }

      const token = localStorage.getItem("token");
      if (token) {
        const decoded = decodeToken(token) as
          | { role?: string; employee_id?: string }
          | null;

        if (decoded?.employee_id) {
          const emp = decoded.employee_id;
          if (STORE_OUT_ONLY.includes(emp)) {
            navigate("/store-out-approval", { replace: true });
            return;
          }
          if (emp === APPROVE_INDENT_ONLY) {
            // ✅ fixed path
            navigate("/approve-indent-data", { replace: true });
            return;
          }
        }

        if (decoded?.role === "admin") {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/user-indent", { replace: true });
        }
      } else {
        navigate("/");
      }
    } catch {
      toast.error("Something went wrong! Try again");
    }
  }

  function onError(e: any) {
    console.log(e);
  }

  return (
    <div className="grid place-items-center h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-blue-50">
      <Card className="w-full max-w-sm">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onError)}
            className="grid gap-6"
          >
            <CardHeader className="text-center flex justify-center flex-col items-center">
              <Logo size={40} />
              <CardTitle className="font-bold text-3xl">Store App</CardTitle>
              <CardDescription>Please login to your account</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username / Employee ID</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter username or S08362" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={visible ? "text" : "password"}
                          placeholder="Enter password"
                          {...field}
                        />
                        <Button
                          variant="ghost"
                          className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent active:bg-transparent"
                          tabIndex={-1}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setVisible((v) => !v);
                          }}
                        >
                          {visible ? <EyeClosed /> : <Eye />}
                        </Button>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>

            <CardFooter>
              <Button
                type="submit"
                className="bg-gradient-to-br from-blue-600 to-purple-600 font-medium w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && (
                  <Loader
                    size={20}
                    color="white"
                    aria-label="Loading Spinner"
                    className="mr-2"
                  />
                )}
                Login
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
