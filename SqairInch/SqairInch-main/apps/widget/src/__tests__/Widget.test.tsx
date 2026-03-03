import { bodyMeasurementsFixture, widgetConfigFixture } from "@sqairinch/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Widget } from "../Widget.js";
import * as api from "../api.js";
import { AvatarSvg } from "../avatar-view/AvatarSvg.js";

// Mock the entire api module so Widget tests are not affected by
// retry timeouts or real fetch calls.
vi.mock("../api.js", () => {
  class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number, message: string) {
      super(message);
      this.name = "ApiError";
      this.code = code;
      this.status = status;
    }
  }
  return {
    ApiError,
    fetchConfig: vi.fn(),
    fetchSku: vi.fn(),
    logEvent: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock prediction to return a fixture so rendering doesn't depend on real math.
vi.mock("../avatar-form/prediction.js", () => ({
  predictBodyMeasurements: vi.fn(() => bodyMeasurementsFixture),
}));

// Mock AvatarSvg so individual tests can control its behaviour (throw or render).
vi.mock("../avatar-view/AvatarSvg.js", () => ({
  AvatarSvg: vi.fn(),
}));

const mockFetchConfig = vi.mocked(api.fetchConfig);
const mockLogEvent = vi.mocked(api.logEvent);
const mockAvatarSvg = vi.mocked(AvatarSvg);

const BASE_URL = "https://example.myshopify.com";
const QS = "shop=example.myshopify.com&hmac=abc";
const DEFAULT_CONFIG = { baseUrl: BASE_URL, queryString: QS };

describe("Widget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.logEvent).mockResolvedValue(undefined);
    // Default: AvatarSvg renders a plain SVG so avatar_view tests can find role="img".
    mockAvatarSvg.mockImplementation(() => <svg role="img" aria-label="avatar" />);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Phase transitions
  // ---------------------------------------------------------------------------

  it("shows loading state on mount, then transitions to avatar_form after fetchConfig resolves", async () => {
    mockFetchConfig.mockResolvedValue(widgetConfigFixture);

    render(<Widget config={DEFAULT_CONFIG} />);

    // Loading state is rendered immediately.
    expect(screen.getByRole("status")).toBeInTheDocument();

    // After fetchConfig resolves, avatar_form is shown.
    await waitFor(() => {
      expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
    });
  });

  it("shows error state when fetchConfig fails, with retry working", async () => {
    const err = new api.ApiError("NETWORK_ERROR", 0, "Network unavailable");
    mockFetchConfig.mockRejectedValueOnce(err).mockResolvedValueOnce(widgetConfigFixture);

    const user = userEvent.setup();

    render(<Widget config={DEFAULT_CONFIG} />);

    // Error phase shows the error message and Retry button.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/network unavailable/i)).toBeInTheDocument();

    // Clicking Retry triggers a new fetchConfig call.
    await user.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
    });
    expect(mockFetchConfig).toHaveBeenCalledTimes(2);
  });

  it("avatar_form renders and submits to avatar_view", async () => {
    mockFetchConfig.mockResolvedValue(widgetConfigFixture);

    const user = userEvent.setup();

    render(<Widget config={DEFAULT_CONFIG} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
    });

    // Fill and submit the avatar form.
    await user.clear(screen.getByLabelText(/height/i));
    await user.type(screen.getByLabelText(/height/i), "175");
    await user.clear(screen.getByLabelText(/weight/i));
    await user.type(screen.getByLabelText(/weight/i), "72");
    await user.clear(screen.getByLabelText(/age/i));
    await user.type(screen.getByLabelText(/age/i), "28");
    await user.selectOptions(screen.getByLabelText(/gender/i), "M");
    await user.selectOptions(screen.getByLabelText(/body shape/i), "rectangle");

    await user.click(screen.getByRole("button", { name: /submit/i }));

    // avatar_view renders "Your avatar" heading.
    await waitFor(() => {
      expect(screen.getByText(/your avatar/i)).toBeInTheDocument();
    });
  });

  it("avatar_view renders avatar svg with measurements", async () => {
    mockFetchConfig.mockResolvedValue(widgetConfigFixture);

    const user = userEvent.setup();

    render(<Widget config={DEFAULT_CONFIG} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
    });

    await user.clear(screen.getByLabelText(/height/i));
    await user.type(screen.getByLabelText(/height/i), "175");
    await user.clear(screen.getByLabelText(/weight/i));
    await user.type(screen.getByLabelText(/weight/i), "72");
    await user.clear(screen.getByLabelText(/age/i));
    await user.type(screen.getByLabelText(/age/i), "28");
    await user.selectOptions(screen.getByLabelText(/gender/i), "M");
    await user.selectOptions(screen.getByLabelText(/body shape/i), "rectangle");

    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByRole("img")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Error boundary
  // ---------------------------------------------------------------------------

  it("error boundary catches component errors and shows reset button", async () => {
    mockFetchConfig.mockResolvedValue(widgetConfigFixture);

    // Make AvatarSvg always throw during render → ErrorBoundary catches it.
    // Use mockImplementation (not Once) so React 18's retry-on-error also throws,
    // ensuring ErrorBoundary is triggered rather than silently recovered.
    mockAvatarSvg.mockImplementation(() => {
      throw new Error("Persistent render error");
    });

    // Suppress console.error output from ErrorBoundary.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const user = userEvent.setup();

    render(<Widget config={DEFAULT_CONFIG} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
    });

    // Submit the form to transition to avatar_view, where AvatarSvg renders and throws.
    await user.clear(screen.getByLabelText(/height/i));
    await user.type(screen.getByLabelText(/height/i), "175");
    await user.clear(screen.getByLabelText(/weight/i));
    await user.type(screen.getByLabelText(/weight/i), "72");
    await user.clear(screen.getByLabelText(/age/i));
    await user.type(screen.getByLabelText(/age/i), "28");
    await user.selectOptions(screen.getByLabelText(/gender/i), "M");
    await user.selectOptions(screen.getByLabelText(/body shape/i), "rectangle");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // Event emission
  // ---------------------------------------------------------------------------

  it("fires widget_open on mount", async () => {
    mockFetchConfig.mockResolvedValue(widgetConfigFixture);

    render(<Widget config={DEFAULT_CONFIG} />);

    await waitFor(() => {
      expect(mockLogEvent).toHaveBeenCalledWith(
        BASE_URL,
        QS,
        expect.objectContaining({ type: "widget_open" })
      );
    });
  });

  it("fires avatar_created on first form submit", async () => {
    mockFetchConfig.mockResolvedValue(widgetConfigFixture);

    const user = userEvent.setup();

    render(<Widget config={DEFAULT_CONFIG} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
    });

    await user.clear(screen.getByLabelText(/height/i));
    await user.type(screen.getByLabelText(/height/i), "175");
    await user.clear(screen.getByLabelText(/weight/i));
    await user.type(screen.getByLabelText(/weight/i), "72");
    await user.clear(screen.getByLabelText(/age/i));
    await user.type(screen.getByLabelText(/age/i), "28");
    await user.selectOptions(screen.getByLabelText(/gender/i), "M");
    await user.selectOptions(screen.getByLabelText(/body shape/i), "rectangle");

    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(mockLogEvent).toHaveBeenCalledWith(
        BASE_URL,
        QS,
        expect.objectContaining({ type: "avatar_created" })
      );
    });
  });

  it("fires tryon_requested on avatar_view entry", async () => {
    mockFetchConfig.mockResolvedValue(widgetConfigFixture);

    const user = userEvent.setup();

    render(<Widget config={DEFAULT_CONFIG} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
    });

    await user.clear(screen.getByLabelText(/height/i));
    await user.type(screen.getByLabelText(/height/i), "175");
    await user.clear(screen.getByLabelText(/weight/i));
    await user.type(screen.getByLabelText(/weight/i), "72");
    await user.clear(screen.getByLabelText(/age/i));
    await user.type(screen.getByLabelText(/age/i), "28");
    await user.selectOptions(screen.getByLabelText(/gender/i), "M");
    await user.selectOptions(screen.getByLabelText(/body shape/i), "rectangle");

    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(mockLogEvent).toHaveBeenCalledWith(
        BASE_URL,
        QS,
        expect.objectContaining({ type: "tryon_requested" })
      );
    });
  });

  it("fires avatar_override on subsequent form submits", async () => {
    mockFetchConfig.mockResolvedValue(widgetConfigFixture);

    const user = userEvent.setup();

    render(<Widget config={DEFAULT_CONFIG} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
    });

    // First submit.
    await user.clear(screen.getByLabelText(/height/i));
    await user.type(screen.getByLabelText(/height/i), "175");
    await user.clear(screen.getByLabelText(/weight/i));
    await user.type(screen.getByLabelText(/weight/i), "72");
    await user.clear(screen.getByLabelText(/age/i));
    await user.type(screen.getByLabelText(/age/i), "28");
    await user.selectOptions(screen.getByLabelText(/gender/i), "M");
    await user.selectOptions(screen.getByLabelText(/body shape/i), "rectangle");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/your avatar/i)).toBeInTheDocument();
    });

    // Navigate back to avatar_form.
    await user.click(screen.getByRole("button", { name: /back/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
    });

    // Clear previous logEvent calls to isolate second submission events.
    mockLogEvent.mockClear();

    // Second submit.
    await user.clear(screen.getByLabelText(/height/i));
    await user.type(screen.getByLabelText(/height/i), "180");
    await user.clear(screen.getByLabelText(/weight/i));
    await user.type(screen.getByLabelText(/weight/i), "80");
    await user.clear(screen.getByLabelText(/age/i));
    await user.type(screen.getByLabelText(/age/i), "30");
    await user.selectOptions(screen.getByLabelText(/gender/i), "F");
    await user.selectOptions(screen.getByLabelText(/body shape/i), "rectangle");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(mockLogEvent).toHaveBeenCalledWith(
        BASE_URL,
        QS,
        expect.objectContaining({ type: "avatar_override" })
      );
    });
  });
});
