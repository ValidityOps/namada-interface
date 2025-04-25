import { shortenAddress } from "@namada/utils";
import * as XLSX from "xlsx";
import { ReferralReward } from "./types";

// Helper function to generate CSV data
const generateCsvContent = (rewardsData: ReferralReward[]): string => {
  // CSV Headers
  const headers =
    "Referrer Address,Referee Address,Epoch,Reward (NAM),Validator Name\r\n";

  if (!rewardsData || rewardsData.length === 0) {
    console.warn("No rewards data to generate CSV");
    return headers;
  }

  try {
    // Sort rewards by referee address to group them
    const sortedRewards = [...rewardsData].sort(
      (a, b) =>
        a.refereeAddress.localeCompare(b.refereeAddress) || a.epoch - b.epoch
    );

    // Format each reward as a CSV row and join with Windows-style line breaks (CRLF)
    let currentRefereeAddress: string | null = null;
    const csvRows: string[] = [];

    sortedRewards.forEach((r) => {
      // Check if we have all required data
      if (!r || !r.validator) {
        console.warn("Invalid reward data item", r);
        return;
      }

      // Add a blank row when referee address changes
      if (
        currentRefereeAddress !== null &&
        currentRefereeAddress !== r.refereeAddress
      ) {
        csvRows.push(""); // Add blank row
      }

      currentRefereeAddress = r.refereeAddress;

      // Escape any commas in text fields with quotes
      const validatorName =
        r.validator.name ?
          `"${r.validator.name.replace(/"/g, '""')}"`
        : "Unknown";

      csvRows.push(
        [
          `"${r.referrerAddress}"`,
          `"${r.refereeAddress}"`,
          r.epoch,
          r.amount.toFixed(6),
          validatorName,
        ].join(",")
      );
    });

    return headers + csvRows.join("\r\n");
  } catch (error) {
    console.error("Error generating CSV content:", error);
    return headers + "Error generating CSV data";
  }
};

// Helper function to download CSV
const downloadCsv = (data: string, filename: string): void => {
  // Use BOM (Byte Order Mark) to help Excel recognize UTF-8
  const BOM = "\uFEFF";
  const csvContent = BOM + data;

  // Create a blob with proper MIME type for CSV
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Helper function to create a multi-sheet Excel file
export const downloadMultiSheetExcel = (
  rewardsByReferrer: Record<string, ReferralReward[]>
): void => {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // First, add a sheet with all rewards combined
    const allRewards = Object.values(rewardsByReferrer).flat();
    if (allRewards.length > 0) {
      // Sort all rewards by referee address to group them together
      const sortedAllRewards = [...allRewards].sort(
        (a, b) =>
          a.refereeAddress.localeCompare(b.refereeAddress) || a.epoch - b.epoch
      );

      // Convert rewards to array format with blank rows between referee addresses
      const allRewardsFormatted: (Record<string, string> | null)[] = [];
      let currentRefereeAddress: string | null = null;

      sortedAllRewards.forEach((reward) => {
        // Add a blank row when referee address changes
        if (
          currentRefereeAddress !== null &&
          currentRefereeAddress !== reward.refereeAddress
        ) {
          allRewardsFormatted.push(null); // Add blank row
        }

        currentRefereeAddress = reward.refereeAddress;

        allRewardsFormatted.push({
          "Referrer Address": reward.referrerAddress,
          "Referee Address": reward.refereeAddress,
          Epoch: String(reward.epoch),
          "Reward (NAM)": String(reward.amount.toFixed(6)),
          "Validator Name": reward.validator.name || "Unknown",
        });
      });

      // Convert to AOA format with null rows becoming empty arrays (blank rows)
      const headers = [
        "Referrer Address",
        "Referee Address",
        "Epoch",
        "Reward (NAM)",
        "Validator Name",
      ];
      const dataRows = allRewardsFormatted.map((row) =>
        row ? Object.values(row) : Array(headers.length).fill("")
      );

      // Create worksheet with formatting options
      const worksheet = XLSX.utils.aoa_to_sheet([
        headers, // Headers
        ...dataRows, // Data rows with blank rows
      ]);

      // Auto-size columns based on content (filter out null entries for fitToColumn)
      const columnWidths = fitToColumn(
        allRewardsFormatted.filter(Boolean) as Record<string, unknown>[]
      );
      worksheet["!cols"] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, "All Rewards");
    }

    // Add a sheet for each referrer
    for (const [referrerAddress, rewards] of Object.entries(
      rewardsByReferrer
    )) {
      if (rewards.length > 0) {
        // Sort rewards by referee address to group them together
        const sortedRewards = [...rewards].sort(
          (a, b) =>
            a.refereeAddress.localeCompare(b.refereeAddress) ||
            a.epoch - b.epoch
        );

        // Convert rewards to array format with blank rows between referee addresses
        const referrerRewardsFormatted: (Record<string, string> | null)[] = [];
        let currentRefereeAddress: string | null = null;

        sortedRewards.forEach((reward) => {
          // Add a blank row when referee address changes
          if (
            currentRefereeAddress !== null &&
            currentRefereeAddress !== reward.refereeAddress
          ) {
            referrerRewardsFormatted.push(null); // Add blank row
          }

          currentRefereeAddress = reward.refereeAddress;

          referrerRewardsFormatted.push({
            "Referrer Address": reward.referrerAddress,
            "Referee Address": reward.refereeAddress,
            Epoch: String(reward.epoch),
            "Reward (NAM)": String(reward.amount.toFixed(6)),
            "Validator Name": reward.validator.name || "Unknown",
          });
        });

        // Create worksheet - use shortened address for sheet name
        const shortAddr = shortenAddress(referrerAddress, 8, 4);

        // Convert to AOA format with null rows becoming empty arrays (blank rows)
        const headers = [
          "Referrer Address",
          "Referee Address",
          "Epoch",
          "Reward (NAM)",
          "Validator Name",
        ];
        const dataRows = referrerRewardsFormatted.map((row) =>
          row ? Object.values(row) : Array(headers.length).fill("")
        );

        // Create worksheet with formatting options
        const worksheet = XLSX.utils.aoa_to_sheet([
          headers, // Headers
          ...dataRows, // Data rows with blank rows
        ]);

        // Auto-size columns based on content (filter out null entries for fitToColumn)
        const columnWidths = fitToColumn(
          referrerRewardsFormatted.filter(Boolean) as Record<string, unknown>[]
        );
        worksheet["!cols"] = columnWidths;

        XLSX.utils.book_append_sheet(workbook, worksheet, shortAddr);
      }
    }

    // Generate Excel file with formatting options
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
      cellStyles: true,
    });

    // Generate filename with current date and time
    const now = new Date();
    const dateString = now.toISOString().split("T")[0];
    const filename = `Referral-Rewards-${dateString}.xlsx`;

    // Convert to Blob and download
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error creating Excel file:", error);

    // Fallback: Just download a single CSV with all data
    const allRewards = Object.values(rewardsByReferrer).flat();
    if (allRewards.length > 0) {
      downloadCsv(generateCsvContent(allRewards), "referral_rewards.csv");
    }
  }
};

// Helper function to calculate column widths based on content
export const fitToColumn = (
  data: Record<string, unknown>[]
): { wch: number }[] => {
  if (!data || data.length === 0) return [];

  // Get all the keys from the first object
  const columnNames = Object.keys(data[0]);

  // Initialize the width array with the column header lengths
  const columnWidths = columnNames.map((name) => ({
    wch: Math.max(10, name.length * 1.2), // Base width on header with minimum of 10
  }));

  // Check the width needed for each cell value
  data.forEach((row) => {
    columnNames.forEach((col, i) => {
      const value = row[col]?.toString() || "";
      const cellWidth = Math.min(50, value.length * 1.2); // Cap width at 50 chars

      if (cellWidth > columnWidths[i].wch) {
        columnWidths[i].wch = cellWidth;
      }
    });
  });

  return columnWidths;
};
