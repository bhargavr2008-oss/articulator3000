import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("shows that the starter is ready", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /ready for the idea/i }),
    ).toBeInTheDocument();
  });
});
