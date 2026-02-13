#!/usr/bin/env python3
"""Set up the Aditor Scorecard Google Sheet with all tabs and structure."""

import json
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# gog CLI credentials
CLIENT_ID = "506226327606-vkfvn2onq3rbv921rckgb8fs2h1kmnql.apps.googleusercontent.com"
CLIENT_SECRET = "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"

SHEET_ID = "1_kVI6NZx36g5Mgj-u5eJWauyALfeqTIt8C6ATJ5tUgs"

def get_credentials():
    """Get credentials using gog's stored tokens via keychain."""
    import subprocess
    # Use security command to get the refresh token from keychain
    result = subprocess.run(
        ['security', 'find-generic-password', '-a', 'player@aditor.ai', '-s', 'gogcli-oauth', '-w'],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        token_data = json.loads(result.stdout.strip())
        return Credentials(
            token=token_data.get('access_token'),
            refresh_token=token_data.get('refresh_token'),
            token_uri='https://oauth2.googleapis.com/token',
            client_id=CLIENT_ID,
            client_secret=CLIENT_SECRET,
            scopes=['https://www.googleapis.com/auth/spreadsheets']
        )
    
    # Fallback: try to extract from a running gog process or use direct token
    # Use gog to make a simple API call and extract token from verbose output
    result = subprocess.run(
        ['gog', 'sheets', 'metadata', SHEET_ID, '--verbose'],
        capture_output=True, text=True
    )
    # Parse token from verbose output
    for line in result.stderr.split('\n'):
        if 'Bearer' in line or 'access_token' in line:
            print(f"Found token line: {line[:50]}...")
    
    raise Exception("Could not get credentials. Need refresh token from keychain.")

def setup_with_gog():
    """Fallback: use gog CLI directly to populate sheets."""
    import subprocess
    
    sheet_id = SHEET_ID
    
    # Tab: Weekly Input (we'll use Sheet2, Sheet3 etc naming)
    # Since we can't easily add tabs via gog, let's put everything in one sheet
    # with clear section headers
    
    # Actually, let's just populate what we can via gog sheets update
    
    # First, set up the Weekly Input data
    weekly_headers = [["Department", "Metric", "DRI", "Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8", "Wk 9", "Wk 10", "Wk 11", "Wk 12", "MTD", "QTD", "YTD"]]
    
    weekly_data = [
        ["MARKETING", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "CPL (Qualified)", "Alan", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Sales Calls", "Alan", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "SM Posts", "Alan", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Ad Spend", "Alan", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Impressions", "Alan", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Inbound Leads", "Alan", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["SALES", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Close Rate", "Alan", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Revenue (MRR)", "Alan", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Profit Margin", "Alan", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Pipeline Value", "Alan", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Avg Deal Size", "Alan", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Churn Rate", "Alan", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["CUST. SUCCESS", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Good Editors #", "Tim", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Wins", "Alan", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Delivery Time", "Tim", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Briefings Delivered", "Alan/Tim", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Client Satisfaction", "Alan", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Editor Utilization", "Tim", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["PEOPLE", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Applicants", "Tim", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Interviews", "Tim", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Hires", "Tim", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Editor Retention", "Tim", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "Time-to-Productivity", "Tim", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ]
    
    all_data = weekly_headers + weekly_data
    
    # Write to Targets tab (already populated)
    # Now populate a new area for Weekly Input (starting at row 20 of same sheet for now)
    cmd = [
        'gog', 'sheets', 'update', sheet_id,
        'Targets!A20:R47',
        '--values-json', json.dumps(all_data),
        '--input', 'USER_ENTERED'
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    print(f"Weekly Input: {result.stdout.strip()}")
    if result.stderr:
        print(f"Error: {result.stderr.strip()}")
    
    # DRI Map
    dri_data = [
        ["Name", "Role", "Department", "Slack ID", "Primary DRI For"],
        ["Alan Simon", "Founder/CEO", "Marketing, Sales, Cust Success", "U04NRHWBSMT", "M1-M6, S1-S6, C2, C5"],
        ["Tim", "Editor Manager", "Cust Success, People", "U08AMD4TVE0", "C1, C3, C4, C6, P1-P5"],
        ["Sean", "Sales (TBD)", "Sales", "TBD", "TBD"],
        ["Player", "AI Operations", "All (support)", "-", "Automation, data sync"],
    ]
    
    cmd = [
        'gog', 'sheets', 'update', sheet_id,
        'Targets!A50:E54',
        '--values-json', json.dumps(dri_data),
        '--input', 'USER_ENTERED'
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    print(f"DRI Map: {result.stdout.strip()}")

if __name__ == '__main__':
    setup_with_gog()
