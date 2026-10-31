import { render, screen } from "@testing-library/react";
import Home from "../page";

test("renders the auth gate when logged out", () => {
  render(<Home />);
  // Unauthenticated users land on the login screen.
  expect(screen.getByText("Welcome back")).toBeTruthy();
  expect(screen.getAllByText("blurt").length).toBeGreaterThan(0);
});
